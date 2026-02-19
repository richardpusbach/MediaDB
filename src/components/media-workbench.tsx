"use client";

import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

type Category = { id: string; name: string };

type Asset = {
  id: string;
  title: string;
  userDescription: string;
  fileType: string;
  fileSize: number;
  filePath: string;
  thumbnailPath?: string | null;
  tags: string[];
  categoryId?: string;
  category?: Category;
};

type ViewMode = "gallery" | "add" | "edit";

const DEMO_USER_ID = "demo-user";
const DEMO_WORKSPACE_ID = "demo-workspace";

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read selected file."));
    reader.readAsDataURL(file);
  });
}

export function MediaWorkbench() {
  const [viewMode, setViewMode] = useState<ViewMode>("gallery");

  const [categories, setCategories] = useState<Category[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [filterCategoryId, setFilterCategoryId] = useState("");

  const [editingAssetId, setEditingAssetId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedThumbnail, setSelectedThumbnail] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refreshCategories = useCallback(async () => {
    const res = await fetch(`/api/categories?userId=${DEMO_USER_ID}`);
    const body = await res.json();
    setCategories(body.data ?? []);
  }, []);

  const refreshAssets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ userId: DEMO_USER_ID });
      if (search.trim()) params.set("q", search.trim());
      if (filterCategoryId) params.set("categoryId", filterCategoryId);

      const res = await fetch(`/api/assets?${params.toString()}`);
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "Could not load assets.");
        setAssets([]);
        return;
      }
      setAssets(body.data ?? []);
    } catch {
      setError("Could not load assets.");
    } finally {
      setLoading(false);
    }
  }, [search, filterCategoryId]);

  useEffect(() => {
    void refreshCategories();
    void refreshAssets();
  }, [refreshCategories, refreshAssets]);

  const resetForm = () => {
    setEditingAssetId(null);
    setTitle("");
    setDescription("");
    setTagsInput("");
    setSelectedCategoryId("");
    setNewCategoryName("");
    setSelectedFile(null);
    setThumbnailPreview(null);
    setIsFavorite(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const openAddForm = () => {
    resetForm();
    setError(null);
    setViewMode("add");
  };

  const handleFileSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setSelectedFile(file);

    if (!file || !file.type.startsWith("image/")) {
      setSelectedThumbnail(null);
      return;
    }

    try {
      const preview = await readFileAsDataUrl(file);
      setSelectedThumbnail(preview);
    } catch {
      setSelectedThumbnail(null);
      setError("Could not generate thumbnail preview for selected file.");
    }
  };

  const handleCreateAsset = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setViewMode("edit");
  };

  const handleSelectFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setSelectedFile(file);

    if (!file || !file.type.startsWith("image/")) {
      setThumbnailPreview(null);
      return;
    }

    if (!selectedFile) {
      setError("Please choose a file to attach.");
      return;
    }

    try {
      const categoryId = await ensureCategory();

    await refreshCategories();
    return body.data.id as string;
  };

  const onCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!selectedFile) {
      setError("Please choose a file to attach.");
      return;
    }

    setSubmitting(true);
    try {
      const categoryId = await ensureCategoryId();
      const res = await fetch("/api/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: DEMO_USER_ID,
          workspaceId: DEMO_WORKSPACE_ID,
          title,
          userDescription: description,
          categoryId,
          tags,
          filePath: selectedFile.name,
          fileType: selectedFile.type || "application/octet-stream",
          fileSize: selectedFile.size,
          thumbnailPath: selectedThumbnail
        })
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "Could not create asset.");
        return;
      }
      await refreshAssets();
      goToGallery();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not create asset.");
    } finally {
      setSubmitting(false);
    }
  };

  const onUpdate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!editingAssetId) {
      setError("No asset selected.");
      return;
    }

    setSubmitting(true);
    try {
      const categoryId = await ensureCategoryId();
      const payload: Record<string, unknown> = {
        title,
        userDescription: description,
        categoryId,
        tags,
        isFavorite
      };

      if (selectedFile) {
        payload.filePath = selectedFile.name;
        payload.fileType = selectedFile.type || "application/octet-stream";
        payload.fileSize = selectedFile.size;
        payload.thumbnailPath = thumbnailPreview;
      }

      setTitle("");
      setDescription("");
      setTagsInput("");
      setSelectedCategoryId("");
      setNewCategoryName("");
      setSelectedFile(null);
      setSelectedThumbnail(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      await refreshAssets();
      closeForm();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not create asset.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateAsset = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!editingAssetId) {
      setError("No asset selected for editing.");
      return;
    }

    setSubmitting(true);
    try {
      const categoryId = await ensureCategory();
      const payload: Record<string, unknown> = {
        title,
        userDescription: description,
        categoryId,
        tags,
        isFavorite
      };

      if (selectedFile) {
        payload.filePath = selectedFile.name;
        payload.fileType = selectedFile.type || "application/octet-stream";
        payload.fileSize = selectedFile.size;
        payload.thumbnailPath = selectedThumbnail;
      }

      const response = await fetch(`/api/assets/${editingAssetId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const body = await response.json();
      if (!response.ok) {
        setError(body.error ?? "Could not update asset.");
        return;
      }

      await refreshAssets();
      closeForm();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not update asset.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="stack">
      <section className="hero panel">
        <div>
          <p className="eyebrow">MediaDB</p>
          <h1>Asset Library</h1>
          <p className="muted">Browse your records with thumbnails, then add or edit assets in one click.</p>
        </div>
        <button className="primary" onClick={openAddForm}>
          + Add new asset
        </button>
      </section>

      {viewMode === "gallery" ? (
        <section className="panel">
          <div className="toolbar">
            <h2>Records</h2>
            <div className="filters">
              <input
                placeholder="Search title/description"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <select
                value={filterCategoryId}
                onChange={(event) => setFilterCategoryId(event.target.value)}
              >
                <option value="">All categories</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {error ? <p className="error">{error}</p> : null}
          {loading ? <p>Loading...</p> : null}

          <div className="asset-grid">
            {assets.map((asset) => (
              <button
                key={asset.id}
                className="asset-card"
                type="button"
                onClick={() => openEditForm(asset)}
              >
                {asset.thumbnailPath ? (
                  <img className="asset-thumbnail" src={asset.thumbnailPath} alt={`${asset.title} thumbnail`} />
                ) : (
                  <div className="asset-thumbnail placeholder">No thumbnail</div>
                )}
                <div className="asset-content">
                  <h3>{asset.title}</h3>
                  <p className="muted">{asset.category?.name ?? "Uncategorized"}</p>
                  <p className="muted">
                    {asset.fileType} · {asset.fileSize.toLocaleString()} bytes
                  </p>
                </div>
              </button>
            ))}
          </div>

          {!loading && assets.length === 0 ? <p>No assets found.</p> : null}
        </section>
      ) : null}

      {viewMode === "add" ? (
        <section className="panel">
          <div className="form-header">
            <h2>Add record</h2>
            <button type="button" className="ghost" onClick={closeForm}>
              Back to records
            </button>
          </div>
          <form className="form-grid" onSubmit={handleCreateAsset}>
            <label>
              Title
              <input required value={title} onChange={(event) => setTitle(event.target.value)} />
            </label>

            <label>
              Description
              <textarea value={description} onChange={(event) => setDescription(event.target.value)} />
            </label>

            <label>
              Tags (comma-separated)
              <input value={tagsInput} onChange={(event) => setTagsInput(event.target.value)} />
            </label>

            <label>
              Category
              <select required value={selectedCategoryId} onChange={(event) => setSelectedCategoryId(event.target.value)}>
                <option value="">Select a category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
                <option value="__new">+ Create new category</option>
              </select>
            </label>

            {isInlineCategory ? (
              <label>
                New category
                <input required value={newCategoryName} onChange={(event) => setNewCategoryName(event.target.value)} />
              </label>
            ) : null}

            <label className="file-picker">
              Attach file
              <input
                ref={fileInputRef}
                required
                type="file"
                onChange={(event) => {
                  void handleFileSelected(event);
                }}
              />
            </label>
          ) : null}

          <label className="file-picker">
            Attach file
            <input
              ref={fileInputRef}
              required
              type="file"
              onChange={(event) => {
                void handleFileSelected(event);
              }}
            />
          </label>

          <div className="file-meta">
            <p>
              <strong>Selected file:</strong> {selectedFile?.name ?? "None"}
            </p>
            <p>
              <strong>Type:</strong> {selectedFile?.type || "-"}
            </p>
            <p>
              <strong>Size:</strong> {selectedFile ? `${selectedFile.size.toLocaleString()} bytes` : "-"}
            </p>
            {selectedThumbnail ? (
              <img className="thumbnail-preview" src={selectedThumbnail} alt="Selected file preview" />
            ) : (
              <p className="muted">Thumbnail preview appears here for image files.</p>
            )}
          </div>

        <button className="primary" type="submit" disabled={submitting}>
          {submitting ? "Saving..." : "Save record"}
        </button>
      </form>
      {error ? <p className="error">{error}</p> : null}
    </section>
  );

            <div className="file-meta">
              <p>
                <strong>Selected file:</strong> {selectedFile?.name ?? "None"}
              </p>
              <p>
                <strong>Type:</strong> {selectedFile?.type || "-"}
              </p>
              <p>
                <strong>Size:</strong> {selectedFile ? `${selectedFile.size.toLocaleString()} bytes` : "-"}
              </p>
              {selectedThumbnail ? (
                <img className="thumbnail-preview" src={selectedThumbnail} alt="Selected file preview" />
              ) : (
                <p className="muted">Thumbnail preview appears here for image files.</p>
              )}
            </div>

            <button className="primary" type="submit" disabled={submitting}>
              {submitting ? "Saving..." : "Save record"}
            </button>
          </form>
          {error ? <p className="error">{error}</p> : null}
        </section>
      ) : null}

      {viewMode === "edit" ? (
        <section className="panel">
          <div className="form-header">
            <h2>Edit record</h2>
            <button type="button" className="ghost" onClick={closeForm}>
              Back to records
            </button>
          </div>
          <form className="form-grid" onSubmit={handleUpdateAsset}>
            <label>
              Title
              <input required value={title} onChange={(event) => setTitle(event.target.value)} />
            </label>

        <button className="primary" type="submit" disabled={submitting}>
          {submitting ? "Saving..." : "Save changes"}
        </button>
      </form>
      {error ? <p className="error">{error}</p> : null}
    </section>
  );

        <div className="asset-grid">
          {assets.map((asset) => (
            <article key={asset.id} className="asset-card">
              {asset.thumbnailPath ? (
                <img className="asset-thumbnail" src={asset.thumbnailPath} alt={`${asset.title} thumbnail`} />
              ) : null}
              <h3>{asset.title}</h3>
              <p className="muted">{asset.category?.name ?? "Uncategorized"}</p>
              <p>{asset.userDescription || "No description"}</p>
              <p className="muted">File: {asset.filePath}</p>
              <p className="muted">
                {asset.fileType} · {asset.fileSize.toLocaleString()} bytes
              </p>
              {asset.tags.length > 0 ? (
                <ul className="tag-list">
                  {asset.tags.map((tag) => (
                    <li key={tag}>{tag}</li>
                  ))}
                </ul>
              ) : null}
            </article>
          ))}
        </div>

            <label>
              Tags (comma-separated)
              <input value={tagsInput} onChange={(event) => setTagsInput(event.target.value)} />
            </label>

            <label>
              Category
              <select required value={selectedCategoryId} onChange={(event) => setSelectedCategoryId(event.target.value)}>
                <option value="">Select a category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
                <option value="__new">+ Create new category</option>
              </select>
            </label>

            {isInlineCategory ? (
              <label>
                New category
                <input required value={newCategoryName} onChange={(event) => setNewCategoryName(event.target.value)} />
              </label>
            ) : null}

            <label className="checkbox-label">
              <input type="checkbox" checked={isFavorite} onChange={(event) => setIsFavorite(event.target.checked)} />
              Mark as favorite
            </label>

            <label className="file-picker">
              Replace attachment (optional)
              <input
                ref={fileInputRef}
                type="file"
                onChange={(event) => {
                  void handleFileSelected(event);
                }}
              />
            </label>

            <div className="file-meta">
              {selectedThumbnail ? (
                <img className="thumbnail-preview" src={selectedThumbnail} alt="Asset thumbnail preview" />
              ) : (
                <p className="muted">No thumbnail available.</p>
              )}
            </div>

            <button className="primary" type="submit" disabled={submitting}>
              {submitting ? "Saving..." : "Save changes"}
            </button>
          </form>
          {error ? <p className="error">{error}</p> : null}
        </section>
      ) : null}
    </div>
  );
}
