"""Processing logic replicating simplified entity extraction from C# sample."""
from __future__ import annotations
from typing import Any, Dict, List
from uuid import uuid4
from datetime import datetime, timezone
from . import models
import logging

KEYWORD_SETS = {
    "BLOOD PRESSURE": ["BLOOD PRESSURE", "BP"],
    "DIABETES": ["DIABETES", "DIABETIC"],
    "MEDICATION": ["MEDICATION", "PRESCRIBED", "TAKING", "METFORMIN"],
}

EXTENSION_PREFIX = "Dragon Predict"


logger = logging.getLogger("dragon.pyextension")

class ProcessingService:
    def process(self, payload: models.DragonStandardPayload, request_id: str | None, correlation_id: str | None) -> models.ProcessResponse:
        response = models.ProcessResponse(success=True, message="Payload processed successfully")

        if payload.note:
            # Structured logging; avoid eager f-string serialization
            try:
                logger.info("note model repr: %s", payload.note)
                # logger.info(
                #     "note model json: %s",
                #     payload.note.model_dump_json(by_alias=True, exclude_none=True),
                # )
            except Exception:  # noqa: BLE001
                logger.exception("Failed to log note model")

            sample_entities, adaptive_card = self._process_note(payload.note)
            response.payload["sample-entities"] = sample_entities
            response.payload["adaptive-card"] = adaptive_card
            # NOTE: "samplePluginResult" output is not currently supported by the
            # consuming application and has been removed from the response.
            # Uncomment the line below (and restore the composite logic in
            # _process_note) when samplePluginResult support is re-enabled.
            # response.payload["samplePluginResult"] = composite_plugin
            logger.info("extension response:\n %s", response)

            # TODO: use the payload fields to call out to AI Agents


        # placeholder for future: transcript / iterative transcript / audio handling

        return response

    def _process_note(self, note: models.Note):
        resources: List[Any] = []

        if note.resources:
            for r in note.resources:
                content = r.content
                if not content:
                    continue
                upper = content.upper()
                if any(k in upper for k in KEYWORD_SETS["BLOOD PRESSURE"]):
                    resources.append(self._vital_sign(145.0, "mmHg"))
                if any(k in upper for k in KEYWORD_SETS["DIABETES"]):
                    resources.append(self._medical_code("E11.9", "Type 2 diabetes mellitus without complications"))
                if any(k in upper for k in KEYWORD_SETS["MEDICATION"]):
                    resources.append(self._observation_concept("Prescription medication detected", "medication-concept-001"))

        dsp_entities = models.DspResponse(
            schema_version="0.1",
            document=note.document,
            resources=resources,
        )

        adaptive_card_resource = self._adaptive_card(resources)
        adaptive_card = models.DspResponse(
            schema_version="0.1",
            document=note.document,
            resources=[adaptive_card_resource],
        )

        # NOTE: Composite plugin result (samplePluginResult) is not currently
        # supported by the consuming application. The composite construction
        # below has been removed. To re-enable, uncomment this block and update
        # _process_note to return (dsp_entities, adaptive_card, composite).
        # Also uncomment _composite_medication_summary and _timeline_card below.
        #
        # composite = models.DspResponse(
        #     schema_version="0.1",
        #     document={
        #         "title": note.document.get("title") if note.document else "Clinical Note Analysis",
        #         "type": (note.document or {}).get("type") if note.document else {"text": "note"}
        #     },
        #     resources=[self._composite_medication_summary(resources), self._timeline_card(resources)],
        # )

        return dsp_entities, adaptive_card

    def _medical_code(self, code_value: str, description: str) -> models.MedicalCode:
        return models.MedicalCode(
            id=str(uuid4()),
            code={
                "identifier": code_value,
                "description": description,
                "system": "ICD-10-CM",
                "systemUrl": "http://hl7.org/fhir/sid/icd-10-cm"
            },
            priority=models.Priority.Medium,
            reason="Detected from clinical documentation"
        )

    def _vital_sign(self, value: float, unit: str) -> models.ObservationNumber:
        return models.ObservationNumber(
            id=str(uuid4()),
            value=value,
            valueUnit=unit,
            priority=models.Priority.High,
        )

    def _observation_concept(self, concept_text: str, concept_id: str) -> models.ObservationConcept:
        return models.ObservationConcept(
            id=str(uuid4()),
            value=models.ObservationValue(text=concept_text, conceptId=concept_id),
            priority=models.Priority.Medium,
        )

    def _adaptive_card(self, entities: List[Any]) -> models.VisualizationResource:
        # Build card body similar in spirit to C# version
        body: List[Dict[str, Any]] = [
            {
                "type": "TextBlock",
                "text": "🔍 Clinical Entities Extracted",
                "weight": "Bolder",
                "size": "Default"
            },
            {
                "type": "TextBlock",
                "text": f"Found {len(entities)} clinical {'entity' if len(entities)==1 else 'entities'} in the note",
                "wrap": True,
                "size": "Default",
                "spacing": "Small"
            },
        ]
        if entities:
            for e in entities:
                etype = getattr(e, 'type', 'Entity')
                eid = getattr(e, 'id', '')
                body.append({
                    "type": "Container",
                    "style": "emphasis",
                    "spacing": "Medium",
                    "items": [
                        {"type": "TextBlock", "text": f"**{etype}**", "weight": "Bolder", "size": "Default"},
                        {"type": "TextBlock", "text": eid, "size": "Small", "wrap": True},
                    ],
                })
        else:
            body.append({
                "type": "Container",
                "style": "attention",
                "items": [
                    {"type": "TextBlock", "text": "ℹ️ No clinical entities were detected in this note.", "wrap": True}
                ],
            })
        body.append({
            "type": "TextBlock",
            "text": f"Processed at {datetime.now(timezone.utc).isoformat()}",
            "size": "Small",
            "spacing": "Medium",
        })

        # TODO: add extension prefix to title
        return models.VisualizationResource(
            id=str(uuid4()),
            subtype="note",
            cardTitle=EXTENSION_PREFIX,
            adaptive_card_payload={
                "type": "AdaptiveCard",
                "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
                "version": "1.6",
                "body": body,
                "actions": [
                    {
                        "type": "Action.Execute",
                        "title": "Append to note",
                        "verb": "appendToNoteSection",
                        "id": "appendToNoteSectionAction",
                        "data": {
                            "dragonAppendContent": "appended text content"
                        }
                    },
                    {
                        "type": "Action.Execute",
                        "title": "Dismiss",
                        "verb": "reject",
                        "id": "rejectAction",
                        "data": {
                            "dragonExtensionToolName": "RejectCardTool"
                        }
                    }
                ]
            },
            payloadSources=[
                {
                    "identifier": str(uuid4()),
                    "description": "Sample Extension Clinical Entity Extractor (Python)",
                    "url": "http://localhost:5181/v1/process"
                }
            ],
            dragonCopilotCopyData="Clinical entities extracted from note content",
            partnerLogo="https://contoso.com/logo.png",
            references=[],
        )

    # NOTE: _composite_medication_summary and _timeline_card are not currently
    # used because the samplePluginResult output is not supported by the
    # consuming application. Uncomment these methods (and the composite
    # construction in _process_note) when samplePluginResult support is
    # re-enabled.
    #
    # def _composite_medication_summary(self, entities: List[Any]) -> models.VisualizationResource:
    #     # Simplified medication summary card (parity style example)
    #     body: List[Dict[str, Any]] = [
    #         {
    #             "type": "Container",
    #             "spacing": "Medium",
    #             "items": [
    #                 {"type": "TextBlock", "text": "Patient Medication Analysis", "weight": "Bolder", "size": "Default", "spacing": "None"},
    #                 {"type": "TextBlock", "text": "Demo analysis based on detected entities", "size": "Small", "spacing": "Small", "wrap": True}
    #             ]
    #         }
    #     ]
    #     fact_items: List[Dict[str, str]] = []
    #     med_count = sum(1 for e in entities if getattr(e, 'type', None) == 'ObservationConcept')
    #     condition_count = sum(1 for e in entities if getattr(e, 'type', None) == 'MedicalCode')
    #     vital_count = sum(1 for e in entities if getattr(e, 'type', None) == 'ObservationNumber')
    #     fact_items.append({"title": "Medications Detected:", "value": f"{med_count}"})
    #     fact_items.append({"title": "Conditions Detected:", "value": f"{condition_count}"})
    #     fact_items.append({"title": "Vitals Detected:", "value": f"{vital_count}"})
    #     body.append({
    #         "type": "FactSet",
    #         "facts": fact_items
    #     })
    #
    #     return models.VisualizationResource(
    #         id=str(uuid4()),
    #         subtype="note",
    #         cardTitle="Medication Summary & Recommendations (Demo)",
    #         adaptive_card_payload={
    #             "type": "AdaptiveCard",
    #             "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
    #             "version": "1.6",
    #             "body": body,
    #             "actions": [
    #                 {
    #                     "type": "Action.Execute",
    #                     "title": "Dismiss",
    #                     "verb": "reject",
    #                     "id": "rejectAction",
    #                     "data": {
    #                         "dragonExtensionToolName": "RejectCardTool"
    #                     }
    #                 }
    #             ]
    #         },
    #         payloadSources=[
    #             {"identifier": str(uuid4()), "description": "Python Demo Medication Analysis Service", "url": "http://localhost:5181/v1/process"}
    #         ],
    #         dragonCopilotCopyData="medication_analysis|demo:1|generated:" + datetime.now(timezone.utc).isoformat(),
    #         references=[],
    #         partnerLogo="https://contoso.com/logo.png",
    #     )
    #
    # def _timeline_card(self, entities: List[Any]) -> models.VisualizationResource:
    #     # Simplified timeline card
    #     body: List[Dict[str, Any]] = [
    #         {
    #             "type": "Container",
    #             "items": [
    #                 {"type": "TextBlock", "text": "Lab / Clinical Trend Analysis (Demo)", "weight": "Bolder", "size": "Default"},
    #                 {"type": "TextBlock", "text": f"Detected {len(entities)} entities to date", "size": "Small", "spacing": "Small"}
    #             ]
    #         }
    #     ]
    #     return models.VisualizationResource(
    #         id=str(uuid4()),
    #         subtype="timeline",
    #         cardTitle="Recent Clinical Entities Timeline (Demo)",
    #         adaptive_card_payload={
    #             "type": "AdaptiveCard",
    #             "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
    #             "version": "1.6",
    #             "body": body,
    #             "actions": [
    #                 {
    #                     "type": "Action.Execute",
    #                     "title": "Dismiss",
    #                     "verb": "reject",
    #                     "id": "rejectAction",
    #                     "data": {
    #                         "dragonExtensionToolName": "RejectCardTool"
    #                     }
    #                 }
    #             ]
    #         },
    #         payloadSources=[
    #             {"identifier": str(uuid4()), "description": "Python Demo Timeline Service", "url": "http://localhost:5181/v1/process"}
    #         ],
    #         dragonCopilotCopyData="lab_timeline|demo:1|generated:" + datetime.now(timezone.utc).isoformat(),
    #         partnerLogo="https://contoso.com/logo.png",
    #         references=[],
    #     )