import Link from "next/link";
import CustomScrollbar from "../CustomScrollbar";
import { WorkspaceNavigation } from '@/features/workspace/components/WorkspaceNavigation';
import { APP_NAME } from '@/shared/config/application';

import "./DatasetGallery.css";

function formatDatasetName(name) {
  return String(name).replace(/[_-]+/g, " ").trim();
}

/**
 * @param {{
 *   datasets?: Array<{ id: string, name: string, basePath: string, previewUrl?: string }>,
 *   loading?: boolean,
 *   error?: boolean,
 * }} props
 */
export default function DatasetGallery({
  datasets = [],
  loading = false,
  error = false,
}) {
  const datasetCount = datasets.length;

  return (
    <CustomScrollbar as="main" className="dataset-gallery">
      <section className="dataset-gallery__shell">
        <header className="dataset-gallery__header">
          <div className="dataset-gallery__eyebrow">
            <span>{APP_NAME}</span>
            <WorkspaceNavigation active="results" />
          </div>
          <h1 className="dataset-gallery__title">SELECT DATASET</h1>
          <p className="dataset-gallery__subtitle">
            Select an image to explore its saved analysis.
          </p>
          <div className="dataset-gallery__status-row">
            <span className="dataset-gallery__status-pill">
              DATASETS: {datasetCount}
            </span>
          </div>
        </header>

        {loading && (
          <div className="dataset-gallery__state">Scanning data directory...</div>
        )}

        {!loading && datasets.length === 0 && (
          <div className="dataset-gallery__state">No datasets found.</div>
        )}

        {!loading && datasets.length > 0 && (
          <section className="dataset-gallery__grid">
            {datasets.map((dataset, index) => (
              <Link
                key={dataset.id}
                className="dataset-gallery__card"
                href={`/results/${encodeURIComponent(dataset.id)}`}
              >
                <div className="dataset-gallery__card-head">
                  <span className="dataset-gallery__card-id">
                    SLOT {String(index + 1).padStart(2, "0")}
                  </span>
                </div>
                <div className="dataset-gallery__thumb-wrap">
                  {dataset.previewUrl ?
                    <img
                      src={dataset.previewUrl}
                      alt={formatDatasetName(dataset.name)}
                      className="dataset-gallery__thumb"
                    />
                  : <span className="dataset-gallery__no-preview">NO PREVIEW</span>}
                </div>
                <span className="dataset-gallery__name">
                  {formatDatasetName(dataset.name)}
                </span>
              </Link>
            ))}
          </section>
        )}

        {error && (
          <p className="dataset-gallery__error">
            Could not load the saved results.
          </p>
        )}
      </section>
    </CustomScrollbar>
  );
}
