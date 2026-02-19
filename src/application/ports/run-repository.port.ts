import type { Run } from "@/core/entities/run.entity";
import type { RunId } from "@/core/types/identifiers.type";

export interface RunRepositoryPort {
  findById(id: RunId): Promise<Run | null>;
  create(run: Run): Promise<Run>;
  update(run: Run): Promise<Run>;
}
