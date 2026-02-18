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
  category?: Category;
};

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
  const [categories, setCategories] = useState<Category[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [filterCategoryId, setFilterCategoryId] = useState("");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedThumbnail, setSelectedThumbnail] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refreshCategories = useCallback(async () => {
    const response = await fetch(`/api/categories?userId=${DEMO_USER_ID}`);
    const body = await response.json();
    setCategories(body.data ?? []);
  }, []);

  const refreshAssets = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ userId: DEMO_USER_ID });
      if (search.trim()) params.set("q", search.trim());
      if (filterCategoryId) params.set("categoryId", filterCategoryId);

      const response = await fetch(`/api/assets?${params.toString()}`);
      const body = await response.json();

      if (!response.ok) {
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
  }, [filterCategoryId, search]);

  useEffect(() => {
    void refreshCategories();
  }, [refreshCategories]);

  useEffect(() => {
    void refreshAssets();
  }, [refreshAssets]);

  const isInlineCategory = selectedCategoryId === "__new";

  const tags = useMemo(
    () =>
      tagsInput
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
    [tagsInput]
  );

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

    if (!selectedFile) {
      setError("Please choose a file to attach.");
      return;
    }

    try {
      let categoryId = selectedCategoryId;

      if (isInlineCategory) {
        const categoryResponse = await fetch("/api/categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: DEMO_USER_ID, name: newCategoryName })
        });
        const categoryBody = await categoryResponse.json();

        if (!categoryResponse.ok) {
          setError(categoryBody.error ?? "Could not create category.");
          return;
        }

        categoryId = categoryBody.data.id;
        await refreshCategories();
      }

      const assetResponse = await fetch("/api/assets", {
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

      const assetBody = await assetResponse.json();
      if (!assetResponse.ok) {
        setError(assetBody.error ?? "Could not create asset.");
        return;
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
    } catch {
      setError("Could not create asset.");
    }
  };

  return (
    <div className="stack">
      <section className="panel">
        <h1>MediaDB Starter Workspace</h1>
        <p>
          Start with metadata-first records. If category creation fails, run database migrate +
          seed first.
        </p>
      </section>

      <section className="panel">
        <h2>Add Asset</h2>
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
            <select
              required
              value={selectedCategoryId}
              onChange={(event) => setSelectedCategoryId(event.target.value)}
            >
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
              <input
                required
                value={newCategoryName}
                onChange={(event) => setNewCategoryName(event.target.value)}
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

          <button type="submit">Save asset</button>
        </form>
      </section>

      <section className="panel">
        <div className="toolbar">
          <h2>Library</h2>
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

        {!loading && assets.length === 0 ? <p>No assets found.</p> : null}
      </section>
    </div>
  );
}
