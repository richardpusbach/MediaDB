"use client";

import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type Category = { id: string; name: string };

type Asset = {
  id: string;
  title: string;
  userDescription: string;
  fileType: string;
  fileSize: number;
  tags: string[];
  category?: Category;
};

const DEMO_USER_ID = "demo-user";
const DEMO_WORKSPACE_ID = "demo-workspace";

function formatBytes(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
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
  const [selectedFileName, setSelectedFileName] = useState("");
  const [filePath, setFilePath] = useState("");
  const [fileType, setFileType] = useState("");
  const [fileSize, setFileSize] = useState("0");

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

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      setSelectedFileName("");
      setFilePath("");
      setFileType("");
      setFileSize("0");
      return;
    }

    setSelectedFileName(file.name);
    setFilePath(`uploads/${DEMO_USER_ID}/${file.name}`);
    setFileType(file.type || "application/octet-stream");
    setFileSize(String(file.size));

    if (!title.trim()) {
      const nameWithoutExtension = file.name.replace(/\.[^.]+$/, "");
      setTitle(nameWithoutExtension);
    }
  };

  const handleCreateAsset = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!filePath || Number(fileSize) <= 0) {
      setError("Please choose an image file first.");
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
          filePath,
          fileType,
          fileSize: Number(fileSize)
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
      setSelectedFileName("");
      setFilePath("");
      setFileType("");
      setFileSize("0");
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
            Choose image file
            <input
              required
              type="file"
              accept=".png,.jpg,.jpeg,.gif,.svg,.webp"
              onChange={handleFileChange}
            />
            {selectedFileName ? (
              <span className="file-meta">
                {selectedFileName} · {formatBytes(Number(fileSize))}
              </span>
            ) : (
              <span className="file-meta">No file selected</span>
            )}
          </label>

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

          <label>
            File path (auto)
            <input required value={filePath} readOnly />
          </label>

          <label>
            File type (auto)
            <input required value={fileType} readOnly />
          </label>

          <label>
            File size bytes (auto)
            <input required value={fileSize} readOnly />
          </label>

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
              <h3>{asset.title}</h3>
              <p className="muted">{asset.category?.name ?? "Uncategorized"}</p>
              <p>{asset.userDescription || "No description"}</p>
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
