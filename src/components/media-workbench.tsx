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
  isFavorite?: boolean;
  tags: string[];
  categoryId?: string;
  category?: Category;
};

type ViewMode = "gallery" | "add" | "edit";

const DEMO_USER_ID = "demo-user";
const DEMO_WORKSPACE_ID = "demo-workspace";

function toDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Unable to read file"));
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
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const tags = useMemo(
    () => tagsInput.split(",").map((tag) => tag.trim()).filter(Boolean),
    [tagsInput]
  );

  const isInlineCategory = selectedCategoryId === "__new";

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

  const goToGallery = () => {
    resetForm();
    setViewMode("gallery");
  };

  const openAddForm = () => {
    resetForm();
    setError(null);
    setViewMode("add");
  };

  const openEditForm = (asset: Asset) => {
    setEditingAssetId(asset.id);
    setTitle(asset.title);
    setDescription(asset.userDescription ?? "");
    setTagsInput(asset.tags.join(", "));
    setSelectedCategoryId(asset.categoryId ?? asset.category?.id ?? "");
    setNewCategoryName("");
    setSelectedFile(null);
    setThumbnailPreview(asset.thumbnailPath ?? null);
    setIsFavorite(Boolean(asset.isFavorite));
    if (fileInputRef.current) fileInputRef.current.value = "";
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

    try {
      const preview = await toDataUrl(file);
      setThumbnailPreview(preview);
    } catch {
      setThumbnailPreview(null);
      setError("Could not generate thumbnail preview.");
    }
  };

  const ensureCategoryId = async () => {
    if (!isInlineCategory) return selectedCategoryId;

    const res = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: DEMO_USER_ID, name: newCategoryName })
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error ?? "Could not create category.");

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
          thumbnailPath: thumbnailPreview
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

      const res = await fetch(`/api/assets/${editingAssetId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "Could not update asset.");
        return;
      }
      await refreshAssets();
      goToGallery();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not update asset.");
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
          <p className="muted">Browse records with thumbnails, then add or edit in one click.</p>
        </div>
        <button className="primary" type="button" onClick={openAddForm}>
          + Add new asset
        </button>
      </section>

      {viewMode === "gallery" && (
        <section className="panel">
          <div className="toolbar">
            <h2>Records</h2>
            <div className="filters">
              <input
                placeholder="Search title/description"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <select value={filterCategoryId} onChange={(event) => setFilterCategoryId(event.target.value)}>
                <option value="">All categories</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {error && <p className="error">{error}</p>}
          {loading && <p>Loading...</p>}

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
                  <p className="muted">{asset.fileType} - {asset.fileSize.toLocaleString()} bytes</p>
                </div>
              </button>
            ))}
          </div>

          {!loading && assets.length === 0 && <p>No assets found.</p>}
        </section>
      )}

      {(viewMode === "add" || viewMode === "edit") && (
        <section className="panel">
          <div className="form-header">
            <h2>{viewMode === "add" ? "Add record" : "Edit record"}</h2>
            <button type="button" className="ghost" onClick={goToGallery}>
              Back to records
            </button>
          </div>

          <form className="form-grid" onSubmit={viewMode === "add" ? onCreate : onUpdate}>
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

            {isInlineCategory && (
              <label>
                New category
                <input required value={newCategoryName} onChange={(event) => setNewCategoryName(event.target.value)} />
              </label>
            )}

            {viewMode === "edit" && (
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={isFavorite}
                  onChange={(event) => setIsFavorite(event.target.checked)}
                />
                Mark as favorite
              </label>
            )}

            <label className="file-picker">
              {viewMode === "add" ? "Attach file" : "Replace attachment (optional)"}
              <input
                ref={fileInputRef}
                required={viewMode === "add"}
                type="file"
                onChange={(event) => {
                  void handleSelectFile(event);
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
              {thumbnailPreview ? (
                <img className="thumbnail-preview" src={thumbnailPreview} alt="Asset preview" />
              ) : (
                <p className="muted">Thumbnail preview appears for image files.</p>
              )}
            </div>

            <button className="primary" type="submit" disabled={submitting}>
              {submitting ? "Saving..." : viewMode === "add" ? "Save record" : "Save changes"}
            </button>
          </form>

          {error && <p className="error">{error}</p>}
        </section>
      )}
    </div>
  );
}
