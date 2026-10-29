const validId = id => typeof id === 'string' && Boolean(id) && !id.startsWith('.') && !/[\\/:\x00-\x1f]/.test(id);

export async function loadDatasets({ signal, fetcher = fetch } = {}) {
  const options = { cache: 'no-store', signal };
  const response = await fetcher('/data/catalog.json', options);
  if (!response.ok) throw new Error('Could not load the dataset index.');
  const catalog = await response.json();
  if (!Array.isArray(catalog) || catalog.some(item => !validId(item?.id) || !Array.isArray(item.availableFiles))) {
    throw new Error('Invalid dataset index.');
  }
  const datasets = await Promise.all(catalog.map(async item => {
    const basePath = `/data/${encodeURIComponent(item.id)}`;
    const metadataResponse = await fetcher(`${basePath}/metadata.json`, options);
    if ([404, 410].includes(metadataResponse.status)) return null;
    if (!metadataResponse.ok) throw new Error('Could not read dataset metadata.');
    const metadata = await metadataResponse.json();
    if (!Array.isArray(metadata?.extracts) || !(metadata.image_width > 0) || !(metadata.image_height > 0)) return null;
    let previewUrl = '';
    const preview = item.availableFiles.find(file => /^original\/[^/]+\.(webp|png|jpe?g)$/i.test(file));
    if (preview) {
      const url = `${basePath}/${preview.split('/').map(encodeURIComponent).join('/')}`;
      const image = await fetcher(url, { ...options, method: 'HEAD' });
      if (image.ok) previewUrl = url;
      else if (![404, 410].includes(image.status)) throw new Error('Could not check dataset preview.');
    }
    return {
      ...item, basePath, previewUrl,
      name: typeof metadata.source_image === 'string' ? metadata.source_image.split(/[\\/]/).pop() : item.id,
    };
  }));
  return datasets.filter(Boolean);
}
