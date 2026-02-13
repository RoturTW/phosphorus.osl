const std = @import("std");

pub fn build(b: *std.Build) void {
    // build all
    const default_cmd = b.addSystemCommand(&.{
        "fpp", "run build",
    });
    b.default_step.dependOn(&default_cmd.step);

    // build summit layout
    const summit = b.step("summit", "Build chrome like layout");
    const summit_cmd = b.addSystemCommand(&.{
        "fpp", "run build-summit",
    });

    summit.dependOn(&summit_cmd.step);

    // build chromeLike layout
    const chromeLike = b.step("chromeLike", "Build chrome like layout");
    const chromeLike_cmd = b.addSystemCommand(&.{
        "fpp", "run build-chromeLike",
    });

    chromeLike.dependOn(&chromeLike_cmd.step);
}
