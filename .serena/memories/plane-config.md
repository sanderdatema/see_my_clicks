# Plane Configuration — see-my-clicks

## Project
- project_id: `08b0faf5-8100-4b7d-af90-202c03be24dc`

## State UUIDs
- Todo: `33c80f13-a9f4-4894-99db-1a42182f616f`
- In Progress: `e4173354-3d4e-44b4-ab13-1e02ff1533b6`
- Done: `066938ef-b1e5-439f-ab9f-0cb4a9c333a8`

## Label UUIDs
- backend: `86aecbce-ac1c-420f-89f1-ba68afbbb3f4`
- frontend: `195bfbde-348b-4f3a-85be-0ac7eea1f4b0`
- research: `7094bb8f-5227-40d0-99ec-a51f312228b4`
- refactor: `b54ad8cb-fb55-4106-a151-08c049ffcde6`
- feature: `36bb69a7-cbb9-4fa3-9a9c-006c2e8fb7a0`
- bug: `c08e6958-1a29-4a9e-be95-08c308b4e445`

## Workflow
- Volgende taak: `mcp__plane__list_work_items` → filter op Todo/In Progress → sorteer op priority (urgent→high→medium→low)
- Taak starten: `mcp__plane__update_work_item(issue_id=..., state="e4173354-...")`
- Taak afronden: `mcp__plane__update_work_item(issue_id=..., state="066938ef-...")`
- Nieuwe taak: `mcp__plane__create_work_item(project_id="08b0faf5-...", name=..., priority=..., state="33c80f13-...")`
