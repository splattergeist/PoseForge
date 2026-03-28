/**
 * @module keyboard-shortcuts
 * Sets up keyboard shortcuts for the PoseForge viewer.
 */

/**
 * @param {PoseForgeViewer} viewer
 * @param {PoseForgeUI} ui
 */
export function setupKeyboardShortcuts(viewer, ui) {
  window.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;

    switch (e.key.toLowerCase()) {
      case 'r': viewer.fitView(); break;
      case 'g': viewer.toggleGrid(); break;
      case 'c': ui.cycleCameraMode(); break;
      case 'p': ui.cycleColorMode(); break;
      case '+': case '=': ui.adjustPointSize(1.25); break;
      case '-': case '_': ui.adjustPointSize(0.8); break;
      case ' ': e.preventDefault(); viewer.toggleAutoRotate(); break;
      case '1': viewer.setAxisView('front'); break;
      case '2': viewer.setAxisView('back'); break;
      case '3': viewer.setAxisView('left'); break;
      case '4': viewer.setAxisView('right'); break;
      case '5': viewer.setAxisView('top'); break;
      case '6': viewer.setAxisView('bottom'); break;
    }
  });
}
