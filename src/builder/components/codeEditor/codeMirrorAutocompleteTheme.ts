import { EditorView } from '@codemirror/view';

/**
 * Overrides CodeMirror 6 default autocomplete styling to align with the VS Code
 * suggestion widget (colors, spacing, typography).
 */
export const codeMirrorAutocompleteTheme = EditorView.baseTheme({
  '&dark .cm-tooltip.cm-tooltip-autocomplete': {
    borderRadius: '3px',
    border: '1px solid #454545',
    backgroundColor: '#252526',
    color: '#cccccc',
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.45)',
    overflow: 'hidden',
    '& > ul': {
      fontFamily:
        'Menlo, Monaco, Consolas, "Andale Mono", "Ubuntu Mono", "Courier New", monospace',
      fontSize: '13px',
      maxHeight: 'min(340px, 40vh)',
      minWidth: '280px',
      padding: '4px 0',
      '& > li, & > completion-section': {
        padding: '2px 10px',
        lineHeight: '22px',
        minHeight: '22px',
      },
      '& > completion-section': {
        borderBottom: '1px solid #3c3c3c',
        paddingTop: '6px',
        paddingBottom: '4px',
        fontSize: '11px',
        fontWeight: '600',
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        opacity: 0.85,
      },
    },
  },
  '&dark .cm-tooltip.cm-tooltip-autocomplete ul li[aria-selected]': {
    background: '#04395e',
    color: '#ffffff',
  },
  '&dark .cm-tooltip.cm-tooltip-autocomplete-disabled ul li[aria-selected]': {
    background: '#3c3c3c',
    color: '#cccccc',
  },
  '&light .cm-tooltip.cm-tooltip-autocomplete': {
    borderRadius: '3px',
    border: '1px solid #c8c8c8',
    backgroundColor: '#ffffff',
    color: '#333333',
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.16)',
    overflow: 'hidden',
    '& > ul': {
      fontFamily:
        'Menlo, Monaco, Consolas, "Andale Mono", "Ubuntu Mono", "Courier New", monospace',
      fontSize: '13px',
      maxHeight: 'min(340px, 40vh)',
      minWidth: '280px',
      padding: '4px 0',
      '& > li, & > completion-section': {
        padding: '2px 10px',
        lineHeight: '22px',
        minHeight: '22px',
      },
      '& > completion-section': {
        borderBottom: '1px solid #e5e5e5',
        paddingTop: '6px',
        paddingBottom: '4px',
        fontSize: '11px',
        fontWeight: '600',
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        opacity: 0.85,
      },
    },
  },
  '&light .cm-tooltip.cm-tooltip-autocomplete ul li[aria-selected]': {
    background: '#0060c0',
    color: '#ffffff',
  },
  '&light .cm-tooltip.cm-tooltip-autocomplete-disabled ul li[aria-selected]': {
    background: '#a6a6a6',
    color: '#ffffff',
  },
  '&dark .cm-completionDetail': {
    color: '#9d9d9d',
    fontStyle: 'normal',
    opacity: 1,
  },
  '&light .cm-completionDetail': {
    color: '#6a6a6a',
    fontStyle: 'normal',
    opacity: 1,
  },
  '&dark .cm-completionMatchedText': {
    color: '#75beff',
    textDecoration: 'none',
    fontWeight: '600',
  },
  '&light .cm-completionMatchedText': {
    color: '#007fd4',
    textDecoration: 'none',
    fontWeight: '600',
  },
  '&dark .cm-tooltip.cm-completionInfo': {
    backgroundColor: '#252526',
    color: '#cccccc',
    border: '1px solid #454545',
    borderRadius: '3px',
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.45)',
    fontSize: '12px',
    lineHeight: '1.5',
    padding: '8px 12px',
  },
  '&light .cm-tooltip.cm-completionInfo': {
    backgroundColor: '#ffffff',
    color: '#333333',
    border: '1px solid #c8c8c8',
    borderRadius: '3px',
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.16)',
    fontSize: '12px',
    lineHeight: '1.5',
    padding: '8px 12px',
  },
  '.cm-completionListIncompleteTop:before, .cm-completionListIncompleteBottom:after': {
    fontSize: '11px',
    letterSpacing: '0.12em',
  },
});
