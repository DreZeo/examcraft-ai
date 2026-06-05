import { Component, type ReactNode } from "react";
import { FileX } from "lucide-react";

interface State { error: Error | null }

/**
 * Catches render errors in PaperCanvas so a bad question or view-switch
 * exception shows a recoverable message instead of a blank screen.
 */
export class PaperErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override render() {
    if (this.state.error) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
          <FileX className="h-10 w-10 text-muted-foreground/60" />
          <p className="text-sm font-medium text-foreground">渲染出错</p>
          <p className="max-w-sm text-xs text-muted-foreground">
            {this.state.error.message}
          </p>
          <button
            type="button"
            onClick={() => this.setState({ error: null })}
            className="mt-2 rounded-md border border-border px-3 py-1.5 text-xs text-foreground transition-colors hover:bg-accent cursor-pointer"
          >
            重试
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
