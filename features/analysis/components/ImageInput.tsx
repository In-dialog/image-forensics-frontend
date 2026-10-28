import type { ChangeEvent } from "react";
import styles from "../analysis.module.css";

export function ImageInput({ file, onChange, error, disabled }: {
  file: File | null; onChange: (file: File | null, error: string | null) => void; error: string | null; disabled?: boolean;
}) {
  function selectImage(event: ChangeEvent<HTMLInputElement>) {
    const next = event.target.files?.[0] ?? null;
    if (next && !/\.(png|jpe?g|webp|bmp|tiff?)$/i.test(next.name)) {
      onChange(null, "Choose a PNG, JPG, WebP, BMP, or TIFF image.");
      event.target.value = "";
    } else if (next && next.size > 20 * 1024 * 1024) {
      onChange(null, "This image is too large. Choose an image under 20 MB.");
      event.target.value = "";
    } else if (next && next.size === 0) {
      onChange(null, "This file is empty. Choose another image.");
      event.target.value = "";
    } else onChange(next, null);
  }
  return (
    <section className={styles.imageSection} aria-labelledby="image-heading">
      <h2 id="image-heading">Choose an image</h2>
      <label className={styles.fileInput}>
        <span>{file ? "Change image" : "Choose image"}</span>
        <input type="file" aria-label="Choose image" aria-describedby="image-formats" disabled={disabled} accept=".png,.jpg,.jpeg,.webp,.bmp,.tif,.tiff" onChange={selectImage} />
      </label>
      {file && <p className={styles.selectedFile}>{file.name} <span>{(file.size / 1024 / 1024).toFixed(1)} MB</span></p>}
      <p id="image-formats" className={styles.hint}>PNG, JPG, WebP, BMP, or TIFF · Up to 20 MB</p>
      {error && <p role="alert" className={styles.errorText}>{error}</p>}
    </section>
  );
}
