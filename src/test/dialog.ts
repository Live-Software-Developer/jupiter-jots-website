// jsdom has no HTMLDialogElement.showModal/close. This stub keeps a stack of modal dialogs so
// tests can press Esc on the topmost one, the way a browser does.
const stack: HTMLDialogElement[] = []

export function installDialogStub() {
  if (typeof HTMLDialogElement === 'undefined') return // node-environment test files
  const proto = HTMLDialogElement.prototype
  if (typeof proto.showModal === 'function' && !('__stub' in proto)) return
  Object.assign(proto, {
    __stub: true,
    showModal(this: HTMLDialogElement) {
      if (this.open) throw new DOMException('Dialog already open', 'InvalidStateError')
      this.setAttribute('open', '')
      stack.push(this)
    },
    close(this: HTMLDialogElement) {
      if (!this.open) return
      this.removeAttribute('open')
      stack.splice(stack.indexOf(this), 1)
      this.dispatchEvent(new Event('close'))
    },
  })
}

/** Esc as the browser handles it: `cancel` then `close` on the topmost modal dialog only. */
export function pressEscape() {
  for (let i = stack.length - 1; i >= 0; i--) {
    const top = stack[i]
    if (!top.isConnected) {
      stack.splice(i, 1)
      continue
    }
    if (top.dispatchEvent(new Event('cancel', { cancelable: true }))) top.close()
    return
  }
}
