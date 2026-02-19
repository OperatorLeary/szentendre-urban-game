export abstract class Entity<TId extends string> {
  protected constructor(public readonly id: TId) {}
}
