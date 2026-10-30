// One source for screenshots, numbered callouts, GitHub Markdown and HTML.
// Use stable accessible labels, rather than generated CSS module class names.
export const dataset = 'accuracy-scene-final-b9cba790e93a';
export const viewport = { width: 1440, height: 1000 };
export const intro = [
  'Use Image Forensics Analysis to examine a saved image analysis or create a new one. This guide follows the main decisions, then shows how to read the results. The numbered markers in each screenshot match the explanations directly below it.',
  'The results viewer works without the backend. New analyses require the backend, its models, and the optional forensic tools you select. Start with the installation instructions in the frontend and backend READMEs; this guide begins after the website opens.',
  'Screenshots use the released interface and a bundled example dataset. The analysis configuration, progress and recovery screens use controlled demonstration states. They illustrate the controls, not a measured run time or a new forensic conclusion. Saved model interpretations are evidence to review, not verified facts about the people or events depicted.',
];

const mark = (selector, title, text, placement = 'left') => ({ selector, title, text, placement });
export const sections = [
  {
    id: '01-home', title: 'Choose a starting point', screen: 'home',
    action: 'Open the website. Choose View database to explore saved work, or New analysis to prepare a run.',
    marks: [
      mark('nav[aria-label="Start page"] a[href="/results"]', 'View database', 'Opens the included examples and analyses downloaded into this frontend. Viewing them does not load AI models or require a running backend.', 'top'),
      mark('nav[aria-label="Start page"] a[href="/analysis"]', 'New analysis', 'Opens the Executor, where you choose an image and the stages to run. The backend must be available to load its configuration and start work.', 'top'),
      mark('nav[aria-label="Workspace"]', 'Workspace navigation', 'The top navigation is available throughout the app. Home returns here; View database opens saved results; New analysis opens the run controls; About describes the project.', 'bottom'),
    ],
    notes: ['The frontend and backend have separate data folders. The frontend downloads completed results; it does not need shared access to the backend folder. Closing a browser tab does not stop an analysis service.'],
  },
  {
    id: '02-executor', title: 'Choose the image and the work to perform', screen: 'executor',
    action: 'Select Choose image, review the stage checkboxes, and use Start analysis when the configuration is ready.',
    marks: [
      mark('section[aria-labelledby="image-heading"]', 'Choose image', 'Select one PNG, JPEG, WebP, BMP or TIFF image up to 20 MB. Change image replaces the selection before the run starts. The original input is kept by the backend; JPEG bytes are preserved for forensic checks.', 'left'),
      mark('section[aria-labelledby="stages-heading"]', 'Analysis stages', 'Checkboxes decide which outputs to produce. Select all enables every stage; Required only keeps object extraction and original-image export. Those two required stages cannot be unchecked. Optional forgery and synthetic stages need their extra backend installation.', 'left'),
      mark('[role="tablist"][aria-label="Analysis configuration"]', 'Configuration navigation', 'Executor controls what runs. Global settings selects the shared processing device. The other entries edit stage-specific instructions, questions or rankings. Opening a settings tab does not enable that stage; use its Executor checkbox.', 'left'),
      mark('button:has-text("Start analysis")', 'Start analysis', 'Starts one sequential pipeline using a snapshot of the current image, settings and prompts. Save settings stores defaults for later runs without starting one. Start stays disabled until an image and valid configuration are present.', 'bottom'),
    ],
    notes: ['In Global settings, Automatic lets the runtime choose the device; CPU avoids CUDA; CUDA GPU requests the supported NVIDIA setup. Advanced settings contains minimum item size and synthetic-service connection controls. A device selection cannot add support for unsupported hardware.'],
  },
  {
    id: '03-detection', title: 'Tell the analyzer what to detect', screen: 'detection',
    action: 'Open Extract Objects in the right-hand navigation. Describe the visible subjects that matter for your analysis.',
    marks: [
      mark('label:has-text("Positive instructions")', 'Positive instructions', 'Define the focus: which visible objects, people, marks, small details or readable text matter? Prefer observable features and relationships. For example: include discarded containers, attached signs, printed graphics and emblems that are visible in the scene.', 'left'),
      mark('label:has-text("Negative instructions")', 'Negative instructions', 'State exclusions separately: avoid guessing unreadable words, inventing identities, or treating an ambiguous mark as a definite affiliation. Exclusions guide interpretation; they are not output-format instructions.', 'right'),
      mark('[aria-label="Item type"]', 'People / Objects / Text', 'Choose an item type to refine its Include and Exclude instructions. The shared instructions still apply. Analyze Segments uses the same editor for finding parts within detected items.', 'left'),
      mark('label:has-text("Start from a preset")', 'Presets', 'Choose a starting profile, then Apply preset. Applying replaces the current profile for this stage, so review it before continuing. Edit the analysis objective in these fields; the application owns the JSON output structure.', 'right'),
    ],
    notes: ['The pipeline detects regions and then extracts their masks. A person, a shirt, and a graphic printed on that shirt can be different useful regions. Contextual analysis can use the full scene, a nearby view and the target region so a crop is not interpreted in isolation. It still must distinguish visible evidence from uncertain associations.'],
  },
  {
    id: '04-questions', title: 'Ask the questions that matter', screen: 'questions',
    action: 'Open Image Description. Select a question on the left and edit its title and instruction on the right.',
    marks: [
      mark('[aria-label="Description questions"]', 'Question list', 'Select the question you want to edit. Its title becomes a recognizable label in the saved results. Questions can cover literal inventory, visible text, relationships, supported interpretations or uncertainty.', 'left'),
      mark('button:has-text("Add question")', 'Add and manage questions', 'Add question creates a new entry; the adjacent arrow opens templates. Duplicate copies the selected entry, the arrow buttons change its order, and Remove deletes it. At least one question is required, up to twelve.', 'right'),
      mark('label:has-text("What do you want to know?")', 'Question instruction', 'Write one clear analytical request. Example: “Which visible details support the proposed use of this object, and which details remain ambiguous?” The title is a short display label; this longer instruction tells the model what to answer.', 'right'),
      mark('label:has-text("Description style")', 'Answer style', 'Concise requests short answers, Detailed asks for more context and visible evidence, and Bullet points favors scanning. Shared positive and negative instructions apply to all questions in this profile.', 'right'),
    ],
    notes: ['Advanced settings exposes the model, context and generation controls. Leave these alone for an initial run unless your model or hardware requires a change. Questions change what you ask; they do not let you edit response keys, schemas or filenames.'],
  },
  {
    id: '05-rankings', title: 'Define meaningful ranking criteria', screen: 'rankings',
    action: 'Open Full Image Rankings for a scene-level assessment, or Per-Item Rankings for objects and parts. Select a criterion to define its answer type and evidence.',
    marks: [
      mark('[aria-label="Ranking criteria"]', 'Criteria', 'Each criterion has its own label and definition. Select one to edit it. Add criterion and its template menu create more; Duplicate, reorder and Remove work like the question editor. The viewer reads these saved labels and types, including custom criteria.', 'left'),
      mark('label:has-text("Answer type")', 'Answer type', 'Score on a scale uses numeric endpoints. Choose a category uses a list of allowed answers. Yes / No asks a binary question. Select the type that fits the question rather than turning every concept into a percentage.', 'right'),
      mark('label:has-text("What should be evaluated?")', 'Evaluation and exclusions', 'Specify observable evidence for the selected criterion. Define what should count and use What should be excluded? for assumptions or irrelevant signals. For example, separate visible promotional language from the mere presence of a product.', 'right'),
      mark('section:has(> h4:text-is("Score range"))', 'Score range and anchors', 'Set the lowest and highest score, then explain the meaning of each end. A 0–10 criterion might range from no visible cue to explicit, central evidence. Category criteria instead show Allowed answers with Add choice and individual remove controls.', 'right'),
    ],
    notes: ['Unknown or insufficient evidence is distinct from zero and from No. A displayed score percentage means position within that criterion’s configured range; it is not a probability, confidence estimate or percentage of the image. Use an explicitly defined criterion if you want to assess another concept.'],
  },
  {
    id: '06-progress', title: 'Follow a running analysis', screen: 'progress', demonstration: true,
    action: 'After Start analysis, the setup panel becomes an output monitor. Watch the current stage and item progress while previews appear.',
    marks: [
      mark('section[aria-labelledby="preview-heading"]', 'Main preview', 'Shows the selected output image at a contained scale. Depending on the stage this can be a scene overlay, mask, crop, depth output or an analysis context board.', 'left'),
      mark('nav[aria-label="Output previews"]', 'Output thumbnails', 'Select a thumbnail to inspect another generated image. These are intermediate previews; the frontend saves the complete dataset after the backend finishes.', 'top'),
      mark('[aria-label="Current stage progress"]', 'Stage and item progress', 'The right panel reports overall completed stages and the current stage’s substeps. Item totals, skipped items and the current activity explain work within a stage. Stages differ in cost, so stage counts are not a time estimate.', 'left'),
      mark('[role="log"][aria-label="Latest analysis log line"]', 'Latest log line', 'The footer keeps the newest message visible without crowding the preview. Expand the full log when diagnosing an error. View setup lets you inspect the configuration while the run continues; active runs keep their saved configuration snapshot.', 'top'),
    ],
    notes: ['On success, results are downloaded into this frontend and View results becomes available. If only the download fails, Retry download retrieves the completed backend output without rerunning the models. Keep the launcher terminals open while working; closing an owning terminal stops its services.'],
  },
  {
    id: '07-resume', title: 'Resume unfinished work', screen: 'resume', demonstration: true,
    action: 'If a run fails or is interrupted, open Unfinished next to the main action buttons.',
    marks: [
      mark('button[aria-controls][aria-expanded="true"]', 'Unfinished count', 'Shows failed, interrupted and queued analyses available to this backend. This is separate from completed results already stored in the frontend database.', 'bottom'),
      mark('[role="dialog"] li:first-child', 'Run and last stage', 'Each row shows the filename, saved progress and relevant stage. Select the filename to inspect its log and previews. Fix the underlying problem, such as an unavailable model service, before resuming.', 'left'),
      mark('button:has-text("Resume in order")', 'Resume in order', 'Queues the listed unfinished analyses in order. An individual Resume starts or queues just that row. The backend checks saved inputs, configuration and output files, preserves valid completed work, and reruns from the first missing or invalid dependency.', 'left'),
      mark('button[aria-label^="Delete "]', 'Delete', 'Removes the selected unfinished backend run and its files only after you confirm Delete permanently. Use Cancel to keep it. Deleting an unfinished run is different from browsing a previously downloaded result.', 'bottom'),
    ],
    notes: ['Resume does not automatically adopt newly edited global defaults: it uses the original run’s saved settings and prompts. After a code update, restart the owning backend launcher so the service loads the new code, then resume.'],
  },
  {
    id: '08-database', title: 'Open a saved result', screen: 'database',
    action: 'Choose View database, then select an image card.',
    marks: [
      mark('.dataset-gallery__status-pill', 'Dataset count', 'Counts saved analyses available to this viewer. The included database and downloaded results are read from the frontend’s data source, independently of the running backend.', 'bottom'),
      mark('.dataset-gallery__card:first-child', 'Result card', 'The thumbnail and name identify a saved dataset. Select the card to open its image views and recorded outputs. A saved result includes its images and JSON files together; one loose crop is not a complete analysis.', 'right'),
      mark('nav[aria-label="Workspace"] a[href="/analysis"]', 'Return to analysis', 'Use New analysis to create or resume a run. A dataset in the viewer stays readable after the backend stops; starting new work requires the backend again.', 'bottom'),
    ],
    notes: ['Keep the complete result folder when backing up or moving analyses. Available views depend on the stages that ran and the files they produced. Older examples may contain fewer outputs than the full workflow shown here.'],
  },
  {
    id: '09-image-views', title: 'Inspect the scene and its elements', screen: 'viewer',
    action: 'Use the image-view pictograms to move between the saved scene views. Select an element when you need its local evidence.',
    marks: [
      mark('[role="group"][aria-label="Image views"]', 'Image-view navigation', 'The pictograms switch between Composition, Per item, Semantics and Forgery views. These are different ways to inspect the same saved dataset; they do not start a new analysis.', 'bottom'),
      mark('button[aria-label="Semantics"]', 'Semantics', 'Opens the whole-image score profile, rating gauges, item balance, distributions and clusters. Use this when comparing the meanings and relationships recorded in an analysis.', 'bottom'),
    ],
    notes: ['Composition brings together the original and available spatial outputs such as bounding boxes, depth, composition lines and visual attention. Per item exposes detected objects and their parts, with their saved descriptions and measurements. Forgery presents available forensic outputs; a missing stage cannot be recovered by switching views.'],
  },
  {
    id: '10-semantics', title: 'Read whole-image ratings', screen: 'semantics',
    action: 'Open Semantics. Read the scene-level ratings, then select a gauge or chart sector to reveal its evidence.',
    marks: [
      mark('[aria-label="Whole-image ratings"] [aria-label="Score profile"]', 'Rose / Radar profile', 'Compares numeric criteria using their configured scales. Rose uses hatched sectors; Radar changes the profile shape and requires at least three numeric criteria. Missing or categorical answers are not invented as numeric scores.', 'left'),
      mark('[aria-label="Whole-image ratings"] [aria-label="Rating gauges"]', 'Rating gauges', 'Each gauge shows a value and its criterion label. For a score, the ring expresses position within that score’s range. Choice and Yes / No criteria keep their own answer form. Click a gauge to open its recorded explanation.', 'right'),
      mark('[aria-label="Whole-image ratings"] [aria-label="Profile style"]', 'Change the profile view', 'Rose and Radar display the same saved ratings. Changing the chart style does not change the analysis or its ranking values.', 'bottom'),
    ],
    notes: ['For a 0–10 score, 8 appears as 80% of scale. For a −5 to 5 score, 0 is halfway through the scale. These graphics summarize the configured questions; they do not certify authenticity, identity, political affiliation or intent. Read the supporting explanation and the original image together.'],
  },
  {
    id: '11-groups', title: 'Find patterns across items', screen: 'groups',
    action: 'Continue down Semantics. Select a cluster, a distribution bar or a pyramid point to see the items behind it.',
    marks: [
      mark('[aria-label="Item balance pyramid"]', 'Item balance pyramid', 'Projects the relative balance of three score or Yes / No criteria. Axes lets you choose those dimensions. Nearby points can represent several items; select a point to inspect its members. Unknown and all-minimum cases are reported separately.', 'left'),
      mark('[aria-label="Ranking distribution"]', 'Distribution', 'Choose a criterion to see how its answers are distributed across items. The percentages refer to item counts, including unknown answers where shown. Selecting a bar reveals the matching items.', 'left'),
      mark('[aria-label="Semantic clusters"]', 'Clickable clusters', 'Group by similar rankings or a particular criterion. Each group shows item previews, a count/share and a short summary. Select it to reveal its members, then select a member to open the item inspector.', 'right'),
    ],
    notes: ['Explore items & rankings expands the detailed browser below these graphics. Search narrows items or parts; scope and category filters refine the list; Reset clears filters. Similarity groups reflect the saved ranking answers, not an independent conclusion about real-world relationships.'],
  },
  {
    id: '12-item', title: 'Check the evidence for one item', screen: 'item',
    action: 'Select an item from a cluster or chart. Its inspector opens over the overview.',
    marks: [
      mark('[aria-label="Item details"] > header', 'Item identity and context', 'The heading names the selected item; parts can show their parent object. The crop identifies the target. Compare it with the full scene before interpreting a small or ambiguous region.', 'left'),
      mark('[aria-label="Item details"] [aria-label="Rating gauges"]', 'Item ratings', 'These are the selected object’s or part’s answers, not the whole-image ratings. The labels, numeric ranges and categories come from the criterion definitions saved with that run.', 'left'),
      mark('[aria-label="Item details"] summary:has-text("All ranking evidence")', 'All ranking evidence', 'Expand to read every saved criterion value and its supporting explanation. You can also select an individual gauge or profile sector for focused evidence. Unknown values remain distinguishable from zero or No.', 'left'),
      mark('button[aria-label="Close item details"]', 'Return to the overview', 'Close the inspector with this button or Escape. Your cluster selection remains available, so you can inspect another item without opening a separate page.', 'left'),
    ],
    notes: ['Editing a new analysis profile does not relabel an existing result retroactively. The viewer uses the saved descriptors so analyses with different questions, criterion names and answer types remain readable.'],
  },
];

export const stageReference = [
  ['Extract Objects', 'Detects visible people, objects and text, then extracts regions and masks. Required for a new image.'],
  ['Bounding Box Composition', 'Records the layout and spatial relationships of detected bounding boxes.'],
  ['Depth Map', 'Estimates relative scene depth; it is not a calibrated distance measurement.'],
  ['Negative Space', 'Analyzes space around the detected foreground elements.'],
  ['Composition Lines', 'Saves geometric composition guides and line-related outputs.'],
  ['Visual Attention (DeepGaze)', 'Estimates a visual-attention or saliency map; it does not measure an actual viewer’s gaze.'],
  ['Original Image Export', 'Saves a viewer-friendly original-image asset. Included in every new analysis.'],
  ['Analyze Segments', 'Finds meaningful parts within extracted items and retains their parent relationships.'],
  ['Pose Extraction', 'Extracts available body-pose/keypoint information for detected people.'],
  ['Image Description', 'Answers the configured description questions for eligible items and parts.'],
  ['Forgery Detection', 'Runs the installed forensic methods and saves their available detection/localization outputs. Requires the optional forgery installation.'],
  ['Full Image Rankings', 'Evaluates configured criteria against the whole scene.'],
  ['Per-Item Rankings', 'Evaluates configured criteria for eligible objects and parts.'],
  ['Synthetic Analysis', 'Runs the optional synthetic-image classifier. Its score is model output, not a guarantee of origin.'],
];

export const troubleshooting = [
  ['Backend unavailable', 'Start the backend, wait for its API-ready message, then Try again. The setup guide explains the separate backend installation. Saved results remain available without it.'],
  ['Start analysis is disabled', 'Choose an image, complete any highlighted question/criterion fields, and wait for an active run to finish.'],
  ['The old error remains after an update', 'Restart the terminal that owns the backend. Reopening a browser tab cannot reload Python code in a running service. Then use Unfinished → Resume.'],
  ['A stage stops', 'Open the full run log to find the actual error. Restore the required service or model, then Resume; valid earlier work is checked and reused.'],
  ['Analysis finished, but results did not download', 'Use Retry download. This transfers completed output to the frontend rather than starting the models again.'],
  ['A chart or layer is missing', 'Check which stages were selected and whether the saved dataset contains their outputs. Custom categorical criteria do not automatically produce numeric profile axes.'],
];
