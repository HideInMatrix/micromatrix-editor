import type { EditorState, Transaction } from "@mxm-editor/pm";
import { createChainableState } from "./helpers/createChainableState";
import type {
  CanCommands,
  ChainedCommands,
  CommandProps,
  RawCommands,
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

  get hasCustomState() {
    return Boolean(this.customState);
  }

  get commands(): SingleCommands {
    const { rawCommands } = this;
    const { tr } = this.state;
    const props = this.buildProps(tr);

    return Object.fromEntries(
      Object.entries(rawCommands).map(([name, command]) => [
        name,
        (...args: any[]) => {
          const executeCommand = command as (...commandArgs: any[]) => ReturnType<typeof command>;
          const handled = executeCommand(...args)(props);

          if (!this.hasCustomState && this.editor.view && !this.shouldSkipDispatch(tr)) {
            this.editor.view.dispatch(tr);
          }

          return handled;
        },
      ]),
    ) as SingleCommands;
  }

  chain() {
    return this.createChain();
  }

  can() {
    return this.createCan();
  }

  private createChain(startTransaction?: Transaction, shouldDispatch = true) {
    const { rawCommands } = this;
    const hasStartTransaction = Boolean(startTransaction);
    const transaction = startTransaction ?? this.state.tr;
    const callbacks: boolean[] = [];

    const chain = {
      ...Object.fromEntries(
        Object.entries(rawCommands).map(([name, command]) => [
          name,
          (...args: any[]) => {
            const executeCommand = command as (...commandArgs: any[]) => ReturnType<typeof command>;

            callbacks.push(
              executeCommand(...args)(this.buildProps(transaction, shouldDispatch)),
            );
            return chain;
          },
        ]),
      ),
      run: () => {
        if (
          !hasStartTransaction
          && shouldDispatch
          && !this.hasCustomState
          && this.editor.view
          && !this.shouldSkipDispatch(transaction)
        ) {
          this.editor.view.dispatch(transaction);
        }

        return callbacks.every(Boolean);
      },
    } as ChainedCommands;

    return chain;
  }

  private createCan(startTransaction?: Transaction) {
    const { rawCommands } = this;
    const transaction = startTransaction ?? this.state.tr;
    const props = this.buildProps(transaction, false);

    return {
      ...Object.fromEntries(
        Object.entries(rawCommands).map(([name, command]) => [
          name,
          (...args: any[]) => {
            const executeCommand = command as (...commandArgs: any[]) => ReturnType<typeof command>;

            return executeCommand(...args)({ ...props, dispatch: undefined });
          },
        ]),
      ),
      chain: () => this.createChain(transaction, false),
    } as CanCommands;
  }

  private buildProps(transaction: Transaction, shouldDispatch = true): CommandProps {
    const { rawCommands } = this;
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
            (...args: any[]) => {
              const executeCommand = command as (...commandArgs: any[]) => ReturnType<typeof command>;

              return executeCommand(...args)(props);
            },
          ]),
        ) as SingleCommands;
      },
    };

    return props;
  }

  private shouldSkipDispatch(transaction: Transaction) {
    return transaction.getMeta("preventDispatch") === true;
  }

  private get rawCommands(): RawCommands {
    return this.editor.extensionManager.commands;
  }
}
