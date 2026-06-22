// In-memory hand-off for images going into and coming out of the ImageEditor.
// File[] objects can't survive serialization, so we use a module singleton
// that lives as long as the SPA session.

let _pendingFiles   = [];   // raw File[] queued for editing
let _editedFiles    = null; // edited File[] returned by the editor (null = user skipped)
let _returnPath     = '/add-idea'; // page to navigate back to after editing

export const setEditorInput  = (files, returnPath = '/add-idea') => {
  _pendingFiles = files;
  _editedFiles  = null;
  _returnPath   = returnPath;
};

export const getEditorInput  = () => _pendingFiles;
export const getReturnPath   = () => _returnPath;

// Called by the editor when user taps "Done" with edits applied.
export const setEditorOutput = (files) => { _editedFiles = files; };

// Called by AddIdea to consume edited results (clears after one read).
export const takeEditorOutput = () => {
  const f = _editedFiles;
  _editedFiles = null;
  return f;
};
