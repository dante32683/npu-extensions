import {
    Action,
    ActionPanel,
    Clipboard,
    Form,
    Icon,
    Toast,
    environment,
    showToast,
    getPreferenceValues,
} from "@raycast/api"
import { useEffect, useState } from "react"
import { execFile } from "child_process"
import { promisify } from "util"
import path from "path"
import fs from "fs"
import os from "os"
import { ensureBridgeRegisteredOnce } from "../utils/ensure-bridge-registered"

const execFileAsync = promisify(execFile)
const BRIDGE_PATH = path.join(environment.assetsPath, "bin", "NpuBridge.exe")
const BRIDGE_BIN_DIR = path.join(environment.assetsPath, "bin")
const BRIDGE_MANIFEST_SOURCE = path.join(environment.assetsPath, "..", "bridge", "Package.appxmanifest")
const BRIDGE_IDENTITY = "NpuTextToolsBridge.Identity"

type Mode = "grammar" | "formal" | "concise" | "bullets" | "simplify" | "custom"

interface Preferences {
    prefillFromClipboard?: boolean
    showSuccessToasts?: boolean
    ensureModelReady?: boolean
}

type TextRewriteCommandProps = {
    mode: Mode
    title: string
    textPlaceholder?: string
    requiresInstruction?: boolean
}

type FormValues = {
    text: string
    instruction?: string
}

export function TextRewriteCommand({
    mode,
    title,
    textPlaceholder,
    requiresInstruction = false,
}: TextRewriteCommandProps) {
    const prefs = getPreferenceValues<Preferences>()
    const [defaultText, setDefaultText] = useState<string>("")
    const [isLoadingClipboard, setIsLoadingClipboard] = useState(true)
    const [result, setResult] = useState<string | null>(null)

    useEffect(() => {
        if (prefs.prefillFromClipboard === false) {
            setDefaultText("")
            setIsLoadingClipboard(false)
            return
        }

        Clipboard.readText()
            .then(text => setDefaultText(text ?? ""))
            .catch(() => setDefaultText(""))
            .finally(() => setIsLoadingClipboard(false))
    }, [])

    const handleSubmit = async (values: FormValues) => {
        const text = values.text.trim()
        if (!text) {
            await showToast({
                style: Toast.Style.Failure,
                title: "No Text Provided",
                message: "Type or paste text to rewrite.",
            })
            return
        }

        if (!fs.existsSync(BRIDGE_PATH)) {
            await showToast({
                style: Toast.Style.Failure,
                title: "Bridge Not Found",
                message: "Run: dotnet publish -c Release -r win-x64 --self-contained true.",
            })
            return
        }

        const toast = await showToast({
            style: Toast.Style.Animated,
            title: "Running Phi-Silica...",
            message: "First run may take a moment to prepare the model.",
        })

        let tempFile: string | null = null
        try {
            tempFile = path.join(os.tmpdir(), `phi-rewrite-${Date.now()}.tmp`)

            if (mode === "custom") {
                const instruction = (values.instruction ?? "").trim()
                if (!instruction) {
                    toast.style = Toast.Style.Failure
                    toast.title = "No Instruction Provided"
                    return
                }
                fs.writeFileSync(tempFile, JSON.stringify({ instruction, text }), "utf8")
            } else {
                fs.writeFileSync(tempFile, text, "utf8")
            }

            await ensureBridgeRegisteredOnce({
                identityName: BRIDGE_IDENTITY,
                binDir: BRIDGE_BIN_DIR,
                manifestSourcePath: BRIDGE_MANIFEST_SOURCE,
            })

            const args = ["phi-rewrite", mode, tempFile]
            if (prefs.ensureModelReady !== false) {
                args.push("--ensure-ready")
            }

            const { stdout } = await execFileAsync(BRIDGE_PATH, args, {
                cwd: path.dirname(BRIDGE_PATH),
                windowsHide: true,
                maxBuffer: 10 * 1024 * 1024,
            }).catch((err: unknown) => {
                const raw = (err as { stdout?: string }).stdout ?? ""
                try {
                    const j = JSON.parse(raw.trim()) as { message?: string }
                    if (j.message) throw new Error(j.message)
                } catch (e) {
                    if (e instanceof SyntaxError) throw err
                    throw e
                }
                throw err
            })

            const parsed = JSON.parse(stdout.trim())
            if (parsed.status !== "success") throw new Error(parsed.message ?? "Unknown bridge error")

            if (prefs.showSuccessToasts !== false) {
                toast.style = Toast.Style.Success
                toast.title = "Done"
            } else {
                await toast.hide()
            }
            setResult(parsed.result)
        } catch (err: unknown) {
            toast.style = Toast.Style.Failure
            toast.title = "Phi-Silica Error"
            toast.message = err instanceof Error ? err.message : String(err)
        } finally {
            if (tempFile && fs.existsSync(tempFile)) fs.unlinkSync(tempFile)
        }
    }

    if (result !== null) {
        return (
            <Form
                actions={
                    <ActionPanel>
                        <Action.CopyToClipboard title="Copy to Clipboard" content={result} />
                        <Action
                            title="Start Over"
                            icon={Icon.ArrowClockwise}
                            onAction={() => setResult(null)}
                            shortcut={{ modifiers: ["cmd"], key: "r" }}
                        />
                    </ActionPanel>
                }
            >
                <Form.TextArea id="result" title="Result" value={result} onChange={setResult} enableMarkdown />
            </Form>
        )
    }

    return (
        <Form
            isLoading={isLoadingClipboard}
            actions={
                <ActionPanel>
                    <Action.SubmitForm title={title} onSubmit={handleSubmit} />
                </ActionPanel>
            }
        >
            {requiresInstruction ? (
                <Form.TextField
                    id="instruction"
                    title="Instruction"
                    placeholder='e.g. "make this somewhat formal but still friendly"'
                />
            ) : null}
            <Form.TextArea
                id="text"
                title="Text"
                placeholder={textPlaceholder ?? "Paste your text here..."}
                defaultValue={defaultText}
            />
        </Form>
    )
}
