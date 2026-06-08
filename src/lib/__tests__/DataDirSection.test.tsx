import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import "../../i18n";
import { DataDirSection } from "../../components/settings/DataDirSection";

const mocks = vi.hoisted(() => ({
  chooseDataDir: vi.fn(),
  defaultDataDir: vi.fn(),
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
  defaultDataDir: mocks.defaultDataDir,
  openDataDir: mocks.openDataDir,
}));

describe("DataDirSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dataDir = "E:\\Coding\\paper-data";
    mocks.defaultDataDir.mockResolvedValue("C:\\Users\\admin\\Documents\\AI试卷");
    mocks.openDataDir.mockResolvedValue(undefined);
    mocks.chooseDataDir.mockResolvedValue({
      oldDirDeleted: false,
      oldDirDeleteFailed: false,
    });
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
      { deleteOldDir: false },
    );
  });

  it("passes the old-directory cleanup option when enabled", async () => {
    const user = userEvent.setup();
    mocks.openDialog.mockResolvedValue("E:\\Coding\\paper-data-new");

    render(<DataDirSection />);

    await user.click(
      screen.getByRole("checkbox", { name: /迁移成功后删除旧目录/ }),
    );
    await user.click(screen.getByRole("button", { name: "更改位置" }));

    expect(mocks.chooseDataDir).toHaveBeenCalledWith(
      "E:\\Coding\\paper-data-new",
      { deleteOldDir: true },
    );
  });

  it("shows a cleanup warning when old directory deletion fails after relocation", async () => {
    const user = userEvent.setup();
    mocks.openDialog.mockResolvedValue("E:\\Coding\\paper-data-new");
    mocks.chooseDataDir.mockResolvedValue({
      oldDirDeleted: false,
      oldDirDeleteFailed: true,
    });

    render(<DataDirSection />);

    await user.click(
      screen.getByRole("checkbox", { name: /迁移成功后删除旧目录/ }),
    );
    await user.click(screen.getByRole("button", { name: "更改位置" }));

    expect(await screen.findByRole("status")).toHaveTextContent(
      "旧目录删除失败",
    );
  });

  it("shows an app-styled dialog before restoring the default data directory", async () => {
    const user = userEvent.setup();

    render(<DataDirSection />);

    await user.click(screen.getByRole("button", { name: "恢复默认路径" }));

    expect(screen.getByRole("dialog", { name: "恢复默认路径" })).toBeInTheDocument();
    expect(screen.getByText("确认恢复到默认路径？")).toBeInTheDocument();
    expect(
      screen.getByText("C:\\Users\\admin\\Documents\\AI试卷"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("默认路径中已有的同名数据会被当前数据覆盖。"),
    ).toBeInTheDocument();
    expect(mocks.chooseDataDir).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "确认恢复" }));

    expect(mocks.chooseDataDir).toHaveBeenCalledWith(
      "C:\\Users\\admin\\Documents\\AI试卷",
      { deleteOldDir: false },
    );
  });

  it("does not restore the default data directory when the app dialog is canceled", async () => {
    const user = userEvent.setup();

    render(<DataDirSection />);

    await user.click(screen.getByRole("button", { name: "恢复默认路径" }));
    await user.click(screen.getByRole("button", { name: "取消" }));

    expect(mocks.chooseDataDir).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog", { name: "恢复默认路径" })).toBeNull();
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
