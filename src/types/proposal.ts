export type ProposalType = "PONENCIA" | "TALLER";
export type ProposalStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface Proposal {
  id: string;
  callId: string;
  authorUserId: string;
  title: string;
  description: string;
  type: ProposalType;
  status: ProposalStatus;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
}
