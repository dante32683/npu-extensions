using Xunit;

namespace NpuTextToolsSelectionHelper.Tests;

public class RaycastDetectorTests
{
    [Theory]
    [InlineData("Raycast", null, true)]
    [InlineData("raycast-helper", null, true)]
    [InlineData("RAYCAST", @"C:\Apps\Raycast\Raycast.exe", true)]
    [InlineData("notepad", @"C:\Apps\Raycast\host.exe", true)]
    [InlineData("worker", @"C:/Program Files/Raycast/Raycast.exe", true)]
    [InlineData("notepad", @"C:\Windows\notepad.exe", false)]
    [InlineData("chrome", null, false)]
    public void MatchesRaycast_NameAndPath(string name, string? path, bool expected) =>
        Assert.Equal(expected, RaycastDetector.MatchesRaycast(name, path));
}
