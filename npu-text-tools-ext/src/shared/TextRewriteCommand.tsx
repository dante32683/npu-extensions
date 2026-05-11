import { Action, ActionPanel, Clipboard, Form, Icon, Toast, showToast, getPreferenceValues } from "@raycast/api"
import { useEffect, useState } from "react"
import fs from "fs"
import { PhiRewriteMode, runPhiRewriteBridge } from "../utils/phi-rewrite-bridge"
import { BRIDGE_PATH } from "../utils/paths"

type Mode = PhiRewriteMode

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

        try {
            const instruction = mode === "custom" ? (values.instruction ?? "").trim() : undefined
            if (mode === "custom" && !instruction) {
                toast.style = Toast.Style.Failure
                toast.title = "No Instruction Provided"
                return
            }

            const parsedResult = await runPhiRewriteBridge({
                mode,
                text,
                instruction,
                ensureModelReady: prefs.ensureModelReady !== false,
            })

            if (prefs.showSuccessToasts !== false) {
                toast.style = Toast.Style.Success
                toast.title = "Done"
            } else {
                await toast.hide()
            }
            setResult(parsedResult)
        } catch (err: unknown) {
            toast.style = Toast.Style.Failure
            toast.title = "Phi-Silica Error"
            toast.message = err instanceof Error ? err.message : String(err)
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
