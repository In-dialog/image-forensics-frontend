# Third-party components and bundled data

The MIT license in this repository covers the project's own source code.

The app uses Next.js, React, Three.js, React Three Fiber/Drei, Motion, React Photo Album and their dependencies. Their versions/integrity records are in `package-lock.json`; their own licenses apply. Node.js is downloaded from its official distributor if the installer needs a private runtime.

The `data/` directory contains the existing image-analysis database. Its media, depicted works and upstream model outputs are not relicensed under MIT by inclusion here. Existing filenames and analysis provenance are retained where relevant, while developer-machine paths and unused diagnostics are omitted from publication.

The Cloudflare export is a deliberately selected public snapshot. It includes only inventoried files needed by the viewer. Backend model weights, tokens, source upload directories, saved jobs and private runtime configuration are not part of that export.
