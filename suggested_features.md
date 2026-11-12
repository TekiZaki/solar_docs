# Suggested Features

| Category | Name | Type | Impact | Difficulty | Description |
| --- | --- | --- | --- | --- | --- |
| Persistence | Autosave structural photo-slot changes | Improvement | Medium | Low | Call persistNow after addPhotoSlot, deletePhotoSlot, and movePhotoSlot so the JSON always matches the disk images deleted by deletePhotoSlot, closing the remaining reload gap. |
