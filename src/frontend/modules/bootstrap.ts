import { setupForms } from './forms';
import { setupFormControls } from './metadata';
import { setupTagInputs, setTags } from './tagsInput';
import { getClientId, initClientState } from './state';
import { fetchKnowledgeList, fetchKnowledgeDetail } from './api';
import { normalizeKnowledgeId } from './utils/id';
import { renderKnowledgeGrid } from './render';
import { setAllKnowledge } from './state';
