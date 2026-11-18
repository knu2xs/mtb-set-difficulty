import WebMap from "@arcgis/core/WebMap.js";
import Extent from "@arcgis/core/geometry/Extent.js";
import Graphic from "@arcgis/core/Graphic.js";
import FeatureLayer from "@arcgis/core/layers/FeatureLayer.js";
import type { ArcgisMap as ArcgisMapElement } from "@arcgis/map-components/components/arcgis-map/customElement";
import "@arcgis/map-components/components/arcgis-map";
import "@arcgis/map-components/components/arcgis-zoom";
import "@esri/calcite-components/components/calcite-action";
import "@esri/calcite-components/components/calcite-button";
import type { Button } from "@esri/calcite-components/components/calcite-button/customElement";
import "@esri/calcite-components/components/calcite-input-text";
import "@esri/calcite-components/components/calcite-label";
import "@esri/calcite-components/components/calcite-navigation";
import "@esri/calcite-components/components/calcite-navigation-logo";
import "@esri/calcite-components/components/calcite-option";
import "@esri/calcite-components/components/calcite-panel";
import "@esri/calcite-components/components/calcite-select";
import "@esri/calcite-components/components/calcite-shell";
import "@esri/calcite-components/components/calcite-shell-panel";
import "@esri/calcite-components/main.css";
import type { InputText } from "@esri/calcite-components/components/calcite-input-text/customElement";
import type { Option } from "@esri/calcite-components/components/calcite-option/customElement";
import type { Select } from "@esri/calcite-components/components/calcite-select/customElement";
import { loadAppConfig } from "./config";
import "./style.css";
import { firstTrailFeature } from "./trail-selection";
import { TrailHighlight } from "./trail-highlight";
import { StatusDismissal } from "./status-dismissal";
import {
  formatDifficulty,
  getDifficultyChoices,
} from "./trail-layer";
import {
  checkTrailFreshness,
  SubmissionLock,
  submitAttributeUpdate,
  TrailValidationError,
  TrailUpdateError,
} from "./trail-editing";
import {
  validateTrailLayerSchema,
  type TrailLayerSchema,
} from "./trail-layer";

const mapElement = document.querySelector("arcgis-map") as ArcgisMapElement | null;
const statusElement = document.querySelector<HTMLElement>("#app-status");
const detailsPanel = document.querySelector<HTMLElement>("#details-shell-panel");
const detailsClose = document.querySelector<HTMLElement>("#close-details");
const detailsOpen = document.querySelector<HTMLElement>("#open-details");
const emptyDetails = document.querySelector<HTMLElement>("#trail-empty");
const selectedDetails = document.querySelector<HTMLElement>("#trail-details");
const editTrailAction = document.querySelector<Button>("#edit-trail");
const editForm = document.querySelector<HTMLFormElement>("#trail-edit-form");
const nameInput = document.querySelector<InputText>("#edit-name");
const difficultySelect = document.querySelector<Select>("#edit-difficulty");
const editMessage = document.querySelector<HTMLElement>("#edit-message");
const saveEditButton = document.querySelector<HTMLElement>("#save-edit");
const cancelEditButton = document.querySelector<HTMLElement>("#cancel-edit");
const reloadTrailButton = document.querySelector<HTMLElement>("#reload-trail");
let selectedTrail: Graphic | null = null;
let latestConflictingTrail: Graphic | null = null;
const submissionLock = new SubmissionLock();
const trailHighlight = new TrailHighlight();
const statusDismissal = new StatusDismissal(() => {
  if (statusElement) {
    statusElement.hidden = true;
  }
});

for (const event of ["pointerdown", "keydown", "wheel"] as const) {
  document.addEventListener(event, () => statusDismissal.onInteraction(), {
    passive: true,
  });
}

function setDetailsCollapsed(collapsed: boolean): void {
  if (!detailsPanel) {
    throw new Error("The trail details panel is missing.");
  }
  detailsPanel.toggleAttribute("collapsed", collapsed);
  if (detailsOpen) {
    detailsOpen.hidden = !collapsed;
  }
}

function configureDetailsLayout(): void {
  if (!detailsPanel) {
    throw new Error("The trail details panel is missing.");
  }
  const compact = window.matchMedia("(max-width: 40rem)").matches;
  detailsPanel.setAttribute("display-mode", compact ? "float" : "dock");
  if (compact) {
    setDetailsCollapsed(true);
  } else {
    setDetailsCollapsed(false);
  }
}

function clearTrailDetails(): void {
  selectedTrail = null;
  trailHighlight.clear();
  if (emptyDetails) {
    emptyDetails.hidden = false;
  }
  if (selectedDetails) {
    selectedDetails.hidden = true;
  }
  if (editTrailAction) {
    editTrailAction.hidden = true;
  }
  if (editForm) {
    editForm.hidden = true;
  }
}

function setEditMessage(message: string, isError = false): void {
  if (!editMessage) {
    throw new Error("The edit status element is missing.");
  }
  editMessage.textContent = message;
  editMessage.classList.toggle("error", isError);
  editMessage.setAttribute("role", isError ? "alert" : "status");
}

function clearEditValidation(): void {
  if (nameInput) {
    nameInput.status = "idle";
    nameInput.validationMessage = undefined;
  }
  if (difficultySelect) {
    difficultySelect.status = "idle";
    difficultySelect.validationMessage = undefined;
  }
  if (editMessage) {
    setEditMessage("");
  }
}

function setSavingState(saving: boolean): void {
  if (nameInput) {
    nameInput.disabled = saving;
  }
  if (difficultySelect) {
    difficultySelect.disabled = saving;
  }
  saveEditButton?.toggleAttribute("disabled", saving);
  cancelEditButton?.toggleAttribute("disabled", saving);
  reloadTrailButton?.toggleAttribute("disabled", saving);
}

function showTrailDetails(
  graphic: Graphic,
  nameField: string,
  difficultyField: string,
  layer: FeatureLayer,
): void {
  if (!emptyDetails || !selectedDetails) {
    throw new Error("The trail details content is missing.");
  }
  const attributes: Record<string, unknown> = graphic.attributes ?? {};
  const nameElement = document.querySelector<HTMLElement>("#trail-name");
  const difficultyElement =
    document.querySelector<HTMLElement>("#trail-difficulty");
  if (
    !nameElement ||
    !difficultyElement ||
    !nameInput ||
    !difficultySelect ||
    !editTrailAction ||
    !editForm
  ) {
    throw new Error("The trail detail fields are missing.");
  }

  selectedTrail = graphic;
  latestConflictingTrail = null;
  clearEditValidation();
  if (reloadTrailButton) {
    reloadTrailButton.hidden = true;
  }
  const name = attributes[nameField];
  nameElement.textContent =
    typeof name === "string" && name.trim() !== "" ? name : "Name not set";

  const nameSchema = layer.fields.find((field) => field.name === nameField);
  const difficultySchema = layer.fields.find(
    (field) => field.name === difficultyField,
  );
  if (!nameSchema || !difficultySchema) {
    throw new Error("The configured trail fields are no longer available.");
  }
  const choices = getDifficultyChoices(difficultySchema);
  const difficulty = attributes[difficultyField];
  difficultyElement.textContent = formatDifficulty(difficulty, choices);

  nameInput.value = typeof name === "string" ? name : "";
  nameInput.maxLength = nameSchema.length ?? undefined;
  difficultySelect.replaceChildren();
  const placeholder = document.createElement(
    "calcite-option",
  ) as Option;
  placeholder.value = "";
  placeholder.disabled = true;
  placeholder.selected = true;
  placeholder.textContent =
    difficulty == null
      ? "Current difficulty is not set"
      : `Current difficulty is unrecognized: ${String(difficulty)}`;
  difficultySelect.append(placeholder);

  for (const choice of choices) {
    const option = document.createElement("calcite-option") as Option;
    option.value = choice.token;
    option.textContent = choice.label;
    option.selected = choice.code === difficulty;
    difficultySelect.append(option);
  }
  const matchingChoice = choices.find((choice) => choice.code === difficulty);
  difficultySelect.value = matchingChoice?.token ?? "";

  emptyDetails.hidden = true;
  selectedDetails.hidden = false;
  editTrailAction.hidden = false;
  editForm.hidden = true;
  if (saveEditButton) {
    saveEditButton.removeAttribute("disabled");
  }
  setDetailsCollapsed(false);
}

detailsClose?.addEventListener("click", () => setDetailsCollapsed(true));
detailsOpen?.addEventListener("click", () => setDetailsCollapsed(false));
nameInput?.addEventListener("calciteInputTextInput", clearEditValidation);
difficultySelect?.addEventListener(
  "calciteSelectChange",
  clearEditValidation,
);
editTrailAction?.addEventListener("click", () => {
  if (editForm) {
    editForm.hidden = false;
    editTrailAction.hidden = true;
    void nameInput?.setFocus();
  }
});
cancelEditButton?.addEventListener("click", () => {
  if (editForm) {
    editForm.hidden = true;
  }
  latestConflictingTrail = null;
  if (reloadTrailButton) {
    reloadTrailButton.hidden = true;
  }
  if (editTrailAction && selectedTrail) {
    editTrailAction.hidden = false;
    void editTrailAction.setFocus();
  }
});
configureDetailsLayout();
window
  .matchMedia("(max-width: 40rem)")
  .addEventListener("change", configureDetailsLayout);

function setStatus(message: string, isError = false): void {
  if (!statusElement) {
    throw new Error("The application status element is missing.");
  }
  statusElement.textContent = message;
  statusElement.classList.toggle("error", isError);
  statusElement.setAttribute("role", isError ? "alert" : "status");
  statusElement.hidden = false;
  statusDismissal.onNewMessage(isError);
}

function waitForMapReady(map: ArcgisMapElement): Promise<void> {
  if (map.ready) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const cleanup = () => {
      map.removeEventListener("arcgisViewReadyChange", onReady);
      map.removeEventListener("arcgisLoadError", onLoadError);
    };
    const onReady = () => {
      if (map.ready) {
        cleanup();
        resolve();
      }
    };
    const onLoadError = () => {
      cleanup();
      reject(new Error("The ArcGIS map view failed to initialize."));
    };

    map.addEventListener("arcgisViewReadyChange", onReady);
    map.addEventListener("arcgisLoadError", onLoadError, { once: true });
  });
}

async function initializeMap(): Promise<void> {
  if (!mapElement) {
    throw new Error("The map component is missing from the application page.");
  }

  setStatus("Loading trail map configuration…");
  const config = await loadAppConfig();
  const webMap = new WebMap({
    portalItem: { id: config.basemapWebMapItemId },
  });
  const trailLayer = new FeatureLayer({
    url: config.trailLayerUrl,
    title: "Mountain bike trails",
    outFields: ["*"],
  });

  await Promise.all([trailLayer.load(), webMap.load()]);
  validateTrailLayerSchema(trailLayer as TrailLayerSchema, config);
  if (!webMap.basemap) {
    throw new Error(
      `The configured basemap web map (${config.basemapWebMapItemId}) does not contain a basemap.`,
    );
  }
  if (!editForm || !nameInput || !difficultySelect) {
    throw new Error("The trail edit form is missing from the application page.");
  }
  editForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (submissionLock.locked) {
      return;
    }
    const selected = selectedTrail;
    if (!selected) {
      setEditMessage("Select a trail before saving.", true);
      return;
    }

    if (!submissionLock.tryAcquire()) {
      return;
    }
    setSavingState(true);
    let updateAccepted = false;
    let updateStarted = false;
    try {
      const nameSchema = trailLayer.fields.find(
        (field) => field.name === config.nameField,
      );
      const difficultySchema = trailLayer.fields.find(
        (field) => field.name === config.difficultyField,
      );
      if (!nameSchema || !difficultySchema) {
        throw new TrailUpdateError(
          "The configured trail fields are no longer available.",
        );
      }

      const objectId = selected.attributes[trailLayer.objectIdField];
      if (typeof objectId !== "number" || !Number.isFinite(objectId)) {
        throw new TrailUpdateError(
          "The selected trail has no valid numeric object ID.",
        );
      }
      setEditMessage("Checking for newer trail values…");
      let latestFeature: Graphic | null = null;
      const freshness = await checkTrailFreshness(
        async () => {
          const query = trailLayer.createQuery();
          query.objectIds = [objectId];
          query.outFields = [
            trailLayer.objectIdField,
            config.nameField,
            config.difficultyField,
          ];
          const response = await trailLayer.queryFeatures(query);
          latestFeature =
            response.features.find(
              (feature) =>
                feature.attributes[trailLayer.objectIdField] === objectId,
            ) ?? null;
          if (!latestFeature) {
            return null;
          }
          return {
            name: latestFeature.attributes[config.nameField],
            difficulty: latestFeature.attributes[config.difficultyField],
          };
        },
        {
          name: selected.attributes[config.nameField],
          difficulty: selected.attributes[config.difficultyField],
        },
      );
      if (freshness.changedFields.length > 0) {
        latestConflictingTrail = latestFeature;
        if (reloadTrailButton) {
          reloadTrailButton.hidden = false;
        }
        setEditMessage(
          "This trail changed after you opened it. Your edits have not been saved. Reload the current trail to review the latest values.",
          true,
        );
        return;
      }

      setEditMessage("Saving trail changes…");
      updateStarted = true;
      const updated = await submitAttributeUpdate(
        {
          objectIdField: trailLayer.objectIdField,
          objectId,
          nameField: config.nameField,
          difficultyField: config.difficultyField,
          originalName: selected.attributes[config.nameField],
          originalDifficulty: selected.attributes[config.difficultyField],
          nameValue: nameInput.value,
          maxNameLength: nameSchema.length,
          difficultyToken: difficultySelect.value,
          difficultyChoices: getDifficultyChoices(difficultySchema),
        },
        (attributes) =>
          trailLayer.applyEdits({
            updateFeatures: [new Graphic({ attributes })],
          }),
      );
      if (!updated) {
        setEditMessage("No changes to save.");
        return;
      }
      updateAccepted = true;

      const query = trailLayer.createQuery();
      query.objectIds = [objectId];
      query.outFields = ["*"];
      const refreshed = await trailLayer.queryFeatures(query);
      const updatedTrail = refreshed.features.find(
        (feature) =>
          feature.attributes[trailLayer.objectIdField] === objectId,
      );
      if (!updatedTrail) {
        setEditMessage(
          "The service accepted the update, but the trail could not be reloaded. Refresh the map to see the latest data.",
          true,
        );
        return;
      }

      showTrailDetails(
        updatedTrail,
        config.nameField,
        config.difficultyField,
        trailLayer,
      );
      void editTrailAction?.setFocus();
      setStatus("Trail updated successfully.");
    } catch (error: unknown) {
      console.error(
        updateStarted
          ? "Could not save trail changes."
          : "Could not verify the latest trail values.",
        error,
      );
      const detail =
        error instanceof Error
          ? error.message
          : "The service request failed.";
      setEditMessage(
        !updateStarted
          ? `Could not verify the latest trail values, so no changes were saved: ${detail}`
          : updateAccepted
            ? `The service accepted the update, but refreshing the trail failed: ${detail}`
            : `Could not save trail changes: ${detail}`,
        true,
      );
      if (error instanceof TrailValidationError) {
        if (error.field === "name" && nameInput) {
          nameInput.status = "invalid";
          nameInput.validationMessage = error.message;
          void nameInput.setFocus();
        } else if (error.field === "difficulty" && difficultySelect) {
          difficultySelect.status = "invalid";
          difficultySelect.validationMessage = error.message;
          void difficultySelect.setFocus();
        }
      }
    } finally {
      submissionLock.release();
      setSavingState(false);
    }
  });
  reloadTrailButton?.addEventListener("click", () => {
    if (!latestConflictingTrail) {
      return;
    }
    const trail = latestConflictingTrail;
    clearEditValidation();
    showTrailDetails(
      trail,
      config.nameField,
      config.difficultyField,
      trailLayer,
    );
    void editTrailAction?.setFocus();
    setStatus("Current trail values reloaded. Review them before editing.");
  });

  const extent = config.initialExtent
    ? new Extent({
        xmin: config.initialExtent.xmin,
        ymin: config.initialExtent.ymin,
        xmax: config.initialExtent.xmax,
        ymax: config.initialExtent.ymax,
        spatialReference: { wkid: config.initialExtent.wkid },
      })
    : trailLayer.fullExtent;
  if (
    !extent ||
    ![extent.xmin, extent.ymin, extent.xmax, extent.ymax].every(
      Number.isFinite,
    ) ||
    extent.xmin >= extent.xmax ||
    extent.ymin >= extent.ymax
  ) {
    throw new Error(
      "No valid map extent is configured and the trail layer has no usable extent.",
    );
  }

  const ready = waitForMapReady(mapElement);
  webMap.addMany([trailLayer, trailHighlight.layer]);
  mapElement.map = webMap;
  await ready;
  await mapElement.view.goTo(extent);

  let latestClick = 0;
  mapElement.addEventListener("arcgisViewClick", async (event) => {
    if (submissionLock.locked) {
      return;
    }
    const click = ++latestClick;
    try {
      const response = await mapElement.hitTest(event.detail, {
        include: trailLayer,
      });
      if (submissionLock.locked || click !== latestClick) {
        return;
      }
      const graphic = firstTrailFeature(response.results);
      if (graphic) {
        trailHighlight.show(graphic);
        showTrailDetails(
          graphic,
          config.nameField,
          config.difficultyField,
          trailLayer,
        );
      } else {
        clearTrailDetails();
      }
    } catch (error: unknown) {
      if (click !== latestClick) {
        return;
      }
      console.error("Could not select a trail feature.", error);
      setStatus(
        error instanceof Error
          ? `Could not select a trail: ${error.message}`
          : "Could not select a trail because the map request failed.",
        true,
      );
    }
  });

  setStatus("Trail map ready. Select a trail to view its details.");
}

void initializeMap().catch((error: unknown) => {
  console.error("Could not initialize the trail map.", error);
  setStatus(
    error instanceof Error
      ? error.message
      : "An unexpected error prevented the trail map from loading.",
    true,
  );
});
