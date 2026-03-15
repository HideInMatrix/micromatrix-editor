import type { EditorState, Transaction } from "@mxm-editor/pm";
import { createChainableState } from "./createChainableState";
import type {
  CanCommands,
  ChainedCommands,
  CommandProps,
  SingleCommands,
} from "./types";
import type { Editor } from "./Editor";

export class CommandManager {
  private readonly editor: Editor;

  private readonly customState?: EditorState;

  constructor(props: { editor: Editor; state?: EditorState }) {
    this.editor = props.editor;
    this.customState = props.state;
  }

  get state() {
    return this.customState ?? this.editor.state;
  }

  get commands(): SingleCommands {
    const rawCommands = this.rawCommands;
    const tr = this.state.tr;
    const props = this.buildProps(tr);

    return Object.fromEntries(
      Object.entries(rawCommands).map(([name, command]) => [
        name,
        (...args: any[]) => {
          const handled = command(...args)(props);

          if (handled && this.editor.view) {
            this.editor.view.dispatch(tr);
          }

          return handled;
        },
      ]),
    );
  }

  chain() {
    return this.createChain();
  }

  can() {
    return this.createCan();
  }

  private createChain(startTransaction?: Transaction, shouldDispatch = true) {
    const rawCommands = this.rawCommands;
    const transaction = startTransaction ?? this.state.tr;
    const callbacks: boolean[] = [];

    const chain = {
      ...Object.fromEntries(
        Object.entries(rawCommands).map(([name, command]) => [
          name,
          (...args: any[]) => {
            callbacks.push(
              command(...args)(this.buildProps(transaction, shouldDispatch)),
            );
            return chain;
          },
        ]),
      ),
      run: () => {
        if (shouldDispatch && this.editor.view) {
          this.editor.view.dispatch(transaction);
        }

        return callbacks.every(Boolean);
      },
    } as ChainedCommands;

    return chain;
  }

  private createCan(startTransaction?: Transaction) {
    const rawCommands = this.rawCommands;
    const transaction = startTransaction ?? this.state.tr;
    const props = this.buildProps(transaction, false);

    return {
      ...Object.fromEntries(
        Object.entries(rawCommands).map(([name, command]) => [
          name,
          (...args: any[]) => command(...args)({ ...props, dispatch: undefined }),
        ]),
      ),
      chain: () => this.createChain(transaction, false),
    } as CanCommands;
  }

  private buildProps(transaction: Transaction, shouldDispatch = true): CommandProps {
    const rawCommands = this.rawCommands;
    const state = createChainableState({
      state: this.state,
      transaction,
    });

    const props: CommandProps = {
      editor: this.editor,
      state,
      tr: transaction,
      view: this.editor.view,
      dispatch: shouldDispatch ? () => undefined : undefined,
      chain: () => this.createChain(transaction, shouldDispatch),
      can: () => this.createCan(transaction),
      get commands() {
        return Object.fromEntries(
          Object.entries(rawCommands).map(([name, command]) => [
            name,
            (...args: any[]) => command(...args)(props),
          ]),
        );
      },
    };

    return props;
  }

  private get rawCommands() {
    return {
      ...this.editor.coreCommands,
      ...this.editor.extensionManager.commands,
    };
  }
}
