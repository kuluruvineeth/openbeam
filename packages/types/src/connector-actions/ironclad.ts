export interface IroncladWorkflowCreateResult {
  id: string | undefined;
  url: string | undefined;
}

export interface IroncladWorkflowUpdateResult {
  id: string | undefined;
  url: string | undefined;
}

export interface IroncladCommentAddResult {
  id: string | undefined;
}

export interface IroncladActionResults {
  workflow_create: IroncladWorkflowCreateResult;
  workflow_update: IroncladWorkflowUpdateResult;
  comment_add: IroncladCommentAddResult;
}
