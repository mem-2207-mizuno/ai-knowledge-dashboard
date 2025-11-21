import type { Knowledge } from '../../types';

declare const google: any;

type SuccessHandler<T> = (result: T) => void;
type FailureHandler = (error: any) => void;

type KnowledgePayload = Partial<Knowledge> & {
  tags?: string[];
  metadata?: Record<string, any>;
};

export function fetchKnowledgeList(onSuccess: SuccessHandler<any>, onFailure: FailureHandler) {
  google.script.run.withSuccessHandler(onSuccess).withFailureHandler(onFailure).getKnowledgeList();
}

export function fetchKnowledgeDetail(
  id: number,
  onSuccess: SuccessHandler<any>,
  onFailure: FailureHandler
) {
  google.script.run.withSuccessHandler(onSuccess).withFailureHandler(onFailure).getKnowledgeDetail(id);
}

export function createKnowledge(
  payload: KnowledgePayload,
  onSuccess: SuccessHandler<any>,
  onFailure: FailureHandler
) {
  google.script.run.withSuccessHandler(onSuccess).withFailureHandler(onFailure).addKnowledge(payload);
}

export function updateKnowledge(
  id: number,
  payload: KnowledgePayload,
  onSuccess: SuccessHandler<any>,
  onFailure: FailureHandler
) {
  google.script.run
    .withSuccessHandler(onSuccess)
    .withFailureHandler(onFailure)
    .updateKnowledge(id, payload);
}

export function postComment(
  knowledgeId: number,
  comment: string,
  author: string,
  onSuccess: SuccessHandler<boolean>,
  onFailure: FailureHandler
) {
  google.script.run
    .withSuccessHandler(onSuccess)
    .withFailureHandler(onFailure)
    .addComment(knowledgeId, comment, author);
}

export function postLike(
  knowledgeId: number,
  clientId: string,
  onSuccess: SuccessHandler<number>,
  onFailure: FailureHandler
) {
  google.script.run
    .withSuccessHandler(onSuccess)
    .withFailureHandler(onFailure)
    .addLike(knowledgeId, clientId);
}
