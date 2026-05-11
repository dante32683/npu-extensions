using System.Runtime.InteropServices;

namespace OrganizeKeeper;

/// <summary>
/// Thin <c>GetSystemPowerStatus</c> wrapper used by the keeper to skip
/// renames when on battery (per <c>FORWARD_ROADMAP.md</c> §6.3).
/// </summary>
internal static class PowerStatus
{
    [StructLayout(LayoutKind.Sequential)]
    private struct SYSTEM_POWER_STATUS
    {
        public byte ACLineStatus;
        public byte BatteryFlag;
        public byte BatteryLifePercent;
        public byte SystemStatusFlag;
        public int BatteryLifeTime;
        public int BatteryFullLifeTime;
    }

    [DllImport("kernel32.dll", SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool GetSystemPowerStatus(out SYSTEM_POWER_STATUS lpSystemPowerStatus);

    /// <summary>
    /// Returns <c>true</c> when the machine is on AC power or the AC line
    /// status is unknown (255 / 1). Returns <c>false</c> only when we're
    /// confident the device is running on battery (0).
    /// </summary>
    public static bool IsOnAcPower()
    {
        if (!GetSystemPowerStatus(out var status)) return true;
        // 0 = Offline (battery), 1 = Online (AC), 255 = Unknown — treat unknown as AC.
        return status.ACLineStatus != 0;
    }
}
