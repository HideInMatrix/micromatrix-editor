export async function flushEditorCreate() {
  await new Promise<void>((resolve) => {
    window.setTimeout(() => resolve(), 0);
  });

  await Promise.resolve();
}
