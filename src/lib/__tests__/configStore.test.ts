import { beforeEach, describe, expect, it, vi } from "vitest";
import { defaultAppConfig } from "../types/config";
import { useConfigStore } from "../../stores/configStore";

const tauriMocks = vi.hoisted(() => ({
  invoke: vi.fn(),
}));

vi.mock("@tauri-apps/api/core", () => ({
  invoke: tauriMocks.invoke,
}));

describe("configStore data directory relocation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useConfigStore.setState({
      dataDir: "E:\\Coding\\paper-data",
      config: defaultAppConfig(),
      loaded: true,
    });
    tauriMocks.invoke.mockImplementation((command: string) => {
      if (command === "load_config") return Promise.resolve(null);
      if (command === "relocate_data_dir") {
        return Promise.resolve({
          oldDirDeleted: false,
          oldDirDeleteFailed: false,
        });
      }
      return Promise.resolve();
    });
  });

  it("relocates data before switching the configured data directory", async () => {
    await useConfigStore.getState().chooseDataDir("E:\\Coding\\paper-data-new");

    expect(tauriMocks.invoke).toHaveBeenCalledWith("relocate_data_dir", {
      targetDir: "E:\\Coding\\paper-data-new",
      deleteOldDir: false,
    });
    expect(tauriMocks.invoke).not.toHaveBeenCalledWith(
      "set_data_dir",
      expect.anything(),
    );
    expect(useConfigStore.getState().dataDir).toBe("E:\\Coding\\paper-data-new");
    expect(tauriMocks.invoke).toHaveBeenCalledWith(
      "save_config",
      expect.objectContaining({ dataDir: "E:\\Coding\\paper-data-new" }),
    );
  });

  it("passes the old-directory cleanup option to the backend", async () => {
    await useConfigStore
      .getState()
      .chooseDataDir("E:\\Coding\\paper-data-new", { deleteOldDir: true });

    expect(tauriMocks.invoke).toHaveBeenCalledWith("relocate_data_dir", {
      targetDir: "E:\\Coding\\paper-data-new",
      deleteOldDir: true,
    });
  });

  it("keeps the old data directory when relocation fails", async () => {
    tauriMocks.invoke.mockImplementation((command: string) => {
      if (command === "relocate_data_dir") {
        return Promise.reject(new Error("copy failed"));
      }
      return Promise.resolve(null);
    });

    await expect(
      useConfigStore.getState().chooseDataDir("E:\\Coding\\paper-data-new"),
    ).rejects.toThrow("copy failed");

    expect(useConfigStore.getState().dataDir).toBe("E:\\Coding\\paper-data");
    expect(tauriMocks.invoke).not.toHaveBeenCalledWith(
      "save_config",
      expect.anything(),
    );
  });
});
