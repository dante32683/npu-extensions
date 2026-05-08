import {
    Action,
    ActionPanel,
    Form,
    getPreferenceValues,
    LaunchProps,
    showToast,
    Toast,
    environment,
    Icon,
} from "@raycast/api"
import { execFile } from "child_process"
import { promisify } from "util"
import fs from "fs"
import os from "os"
import path from "path"
import { ensureBridgeRegisteredOnce } from "./utils/ensure-bridge-registered"
import { getKeeperStatus, setOverride, setSchedules } from "./utils/keeper-utils"

const execFileAsync = promisify(execFile)

const BRIDGE_PATH = path.join(environment.assetsPath, "bin", "NpuBridge.exe")
const BRIDGE_BIN_DIR = path.join(environment.assetsPath, "bin")
const BRIDGE_MANIFEST_SOURCE = path.join(environment.assetsPath, "..", "bridge", "Package.appxmanifest")
const BRIDGE_IDENTITY = "NpuAwakeBridge.Identity"

interface Preferences {
    showLidNote: boolean
}

type Intent = {
    action: "status" | "start" | "stop" | "schedule" | "unschedule" | "help"
    mode: "indefinite" | "timed" | "until" | "screen-off" | null
    unit: "minutes" | "hours" | null
    value: number | null
    time: string | null
    days: string[] | null
    start: string | null
    end: string | null
}

function dayStrToDow(day: string): number | null {
    const d = day.trim().toLowerCase()
    const map: Record<string, number> = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 }
    return d in map ? map[d] : null
}

function parseHmToTodayEpoch(hm: string): number | null {
    const parts = hm.split(":").map(p => p.trim())
    if (parts.length < 2) return null
    const h = parseInt(parts[0])
    const m = parseInt(parts[1])
    if (isNaN(h) || isNaN(m) || h < 0 || h > 23 || m < 0 || m > 59) return null
    const now = new Date()
    const target = new Date(now)
    target.setHours(h, m, 0, 0)
    return Math.floor(target.getTime() / 1000)
}

async function runIntentExtractor(userText: string): Promise<Intent> {
    if (!fs.existsSync(BRIDGE_PATH)) {
        throw new Error("NPU bridge not found. Publish the awake bridge to assets/bin and register it.")
    }

    await ensureBridgeRegisteredOnce({
        identityName: BRIDGE_IDENTITY,
        binDir: BRIDGE_BIN_DIR,
        manifestSourcePath: BRIDGE_MANIFEST_SOURCE,
    })

    const tempFile = path.join(os.tmpdir(), `awake-intent-${Date.now()}.txt`)
    fs.writeFileSync(tempFile, userText, "utf8")
    try {
        const { stdout } = await execFileAsync(BRIDGE_PATH, ["awake-intent", tempFile], {
            cwd: path.dirname(BRIDGE_PATH),
            windowsHide: true,
            maxBuffer: 10 * 1024 * 1024,
        })
        const parsed = JSON.parse(stdout.trim())
        if (parsed.status !== "success") throw new Error(parsed.message ?? "Unknown bridge error")
        return parsed.intent as Intent
    } finally {
        try {
            fs.unlinkSync(tempFile)
        } catch {
            // ignore
        }
    }
}

interface Arguments {
    text?: string
}

export default function Command(props: LaunchProps<{ arguments: Arguments }>) {
    const { showLidNote } = getPreferenceValues<Preferences>()
    const defaultText = props.arguments.text ?? ""
    const lidNote = showLidNote ? "Note: lid close behavior depends on Windows power settings." : undefined

    async function onSubmit(values: { text: string }) {
        const input = values.text.trim()
        if (!input) {
            await showToast({
                style: Toast.Style.Failure,
                title: "Enter What You Want",
                message: 'Try: "keep awake for 90 minutes".',
            })
            return
        }

        const toast = await showToast({ style: Toast.Style.Animated, title: "Parsing with Phi-Silica..." })

        try {
            // Always check current status first (tool-first pattern).
            await getKeeperStatus()

            const intent = await runIntentExtractor(input)

            if (intent.action === "help") {
                toast.style = Toast.Style.Success
                toast.title = "Try:"
                toast.message =
                    '"keep awake", "keep awake for 90 minutes", "until 17:30", "weekdays 09:00-17:00", "stop schedules".'
                return
            }

            if (intent.action === "status") {
                const s = await getKeeperStatus()
                toast.style = Toast.Style.Success
                toast.title = s.override
                    ? `Awake: ${s.override.mode}`
                    : s.schedules.length > 0
                      ? "Schedules configured"
                      : "Not keeping awake"
                toast.message = 'Use "Awake Status" for details.'
                return
            }

            if (intent.action === "stop") {
                await setOverride(null)
                toast.style = Toast.Style.Success
                toast.title = "PC can now sleep"
                return
            }

            if (intent.action === "unschedule") {
                await setSchedules([])
                toast.style = Toast.Style.Success
                toast.title = "Schedules Cleared"
                return
            }

            if (intent.action === "start") {
                if (intent.mode === "indefinite") {
                    await setOverride({ mode: "indefinite" })
                    toast.style = Toast.Style.Success
                    toast.title = "PC Will Stay Awake Indefinitely"
                    toast.message = lidNote
                    return
                }

                if (intent.mode === "screen-off") {
                    await setOverride({ mode: "screen-off" })
                    toast.style = Toast.Style.Success
                    toast.title = "PC awake, display can sleep"
                    return
                }

                if (intent.mode === "timed") {
                    const value = intent.value ?? null
                    const unit = intent.unit ?? null
                    if (!value || value <= 0 || (unit !== "minutes" && unit !== "hours")) {
                        throw new Error("Missing duration. Try: “keep awake for 90 minutes”.")
                    }
                    const seconds = Math.floor(value * (unit === "hours" ? 3600 : 60))
                    const expiry = Math.floor(Date.now() / 1000) + seconds
                    await setOverride({ mode: "timed", expiryEpochSeconds: expiry })
                    toast.style = Toast.Style.Success
                    toast.title = `PC Will Stay Awake for ${value} ${unit}`
                    toast.message = lidNote
                    return
                }

                if (intent.mode === "until") {
                    const hm = intent.time
                    if (!hm) throw new Error("Missing time. Try: “keep awake until 17:30”.")
                    const target = parseHmToTodayEpoch(hm)
                    if (!target) throw new Error('Invalid time format. Use "HH:mm" like 17:30.')
                    if (target <= Math.floor(Date.now() / 1000)) throw new Error("That time is in the past (today).")
                    await setOverride({ mode: "until", expiryEpochSeconds: target })
                    toast.style = Toast.Style.Success
                    toast.title = `PC Will Stay Awake Until ${hm}`
                    toast.message = lidNote
                    return
                }

                throw new Error("Unsupported start request.")
            }

            if (intent.action === "schedule") {
                const days = (intent.days ?? []).map(dayStrToDow).filter((d): d is number => d !== null)
                const start = intent.start
                const end = intent.end
                if (days.length === 0 || !start || !end) {
                    throw new Error("Missing schedule fields. Try: “weekdays 09:00 to 17:00”.")
                }

                const id = `sched_${Date.now()}`
                const next = [{ id, enabled: true, days, start, end }]
                await setSchedules(next)
                toast.style = Toast.Style.Success
                toast.title = "Schedule Saved"
                toast.message = `${start}-${end} on ${days.length} day(s)`
                return
            }
        } catch (err: unknown) {
            toast.style = Toast.Style.Failure
            toast.title = "Smart Awake Error"
            toast.message = err instanceof Error ? err.message : String(err)
        }
    }

    return (
        <Form
            navigationTitle="Smart Awake"
            actions={
                <ActionPanel>
                    <Action.SubmitForm title="Run" icon={Icon.Wand} onSubmit={onSubmit} />
                </ActionPanel>
            }
        >
            <Form.Description
                title="Note"
                text="This prevents idle sleep; lid close / power button depends on Windows power settings."
            />
            <Form.TextArea
                id="text"
                title="What do you want?"
                placeholder='e.g. "keep awake for 90 minutes", "until 17:30", "weekdays 09:00-17:00", "stop schedules"'
                defaultValue={defaultText}
            />
            <Form.Separator />
            <Form.Description title="Tip" text="If you prefer deterministic controls, use the other Awake commands." />
        </Form>
    )
}
