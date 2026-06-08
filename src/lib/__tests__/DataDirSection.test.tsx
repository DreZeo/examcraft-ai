import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import "../../i18n";
import { DataDirSection } from "../../components/settings/DataDirSection";

const mocks = vi.hoisted(() => ({
  chooseDataDir: vi.fn(),
  openDialog: vi.fn(),
  openDataDir: vi.fn(),
}));

let dataDir: string | null;

vi.mock("../../stores/configStore", () => ({
  useConfigStore: (selector: (state: unknown) => unknown) =>
    selector({
      dataDir,
      chooseDataDir: mocks.chooseDataDir,
    }),
}));

vi.mock("@tauri-apps/plugin-dialog", () => ({
  open: mocks.openDialog,
}));

vi.mock("../../lib/storage/tauri", () => ({
  openDataDir: mocks.openDataDir,
}));

describe("DataDirSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dataDir = "E:\\Coding\\paper-data";
    mocks.openDataDir.mockResolvedValue(undefined);
    mocks.chooseDataDir.mockResolvedValue(undefined);
  });

  it("opens the configured data directory in the system file manager", async () => {
    const user = userEvent.setup();
    render(<DataDirSection />);

    await user.click(screen.getByRole("button", { name: "在文件管理器中打开" }));

    expect(mocks.openDataDir).toHaveBeenCalledWith("E:\\Coding\\paper-data");
  });

  it("shows a localized error when the system rejects opening the directory", async () => {
    const user = userEvent.setup();
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.openDataDir.mockRejectedValue(new Error("permission denied"));

    render(<DataDirSection />);

    await user.click(screen.getByRole("button", { name: "在文件管理器中打开" }));

    expect(await screen.findByRole("status")).toHaveTextContent(
      "无法打开数据目录",
    );
    consoleError.mockRestore();
  });

  it("disables the file manager action when no data directory is configured", () => {
    dataDir = null;

    render(<DataDirSection />);

    expect(screen.getByRole("button", { name: "在文件管理器中打开" }))
      .toBeDisabled();
  });

  it("relocates to the selected data directory", async () => {
    const user = userEvent.setup();
    mocks.openDialog.mockResolvedValue("E:\\Coding\\paper-data-new");

    render(<DataDirSection />);

    await user.click(screen.getByRole("button", { name: "更改位置" }));

    expect(mocks.chooseDataDir).toHaveBeenCalledWith(
      "E:\\Coding\\paper-data-new",
    );
  });

  it("shows a localized error when data directory relocation fails", async () => {
    const user = userEvent.setup();
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.openDialog.mockResolvedValue("E:\\Coding\\paper-data-new");
    mocks.chooseDataDir.mockRejectedValue(new Error("copy failed"));

    render(<DataDirSection />);

    await user.click(screen.getByRole("button", { name: "更改位置" }));

    expect(await screen.findByRole("status")).toHaveTextContent(
      "迁移数据目录失败",
    );
    consoleError.mockRestore();
  });
});
