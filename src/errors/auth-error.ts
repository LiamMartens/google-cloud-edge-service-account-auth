export class AuthError<D> extends Error {
  public status: number;
  public data: D | null;

  constructor(reason: string, status: number, data?: D) {
    super(reason);
    this.status = status;
    this.data = data ?? null;
  }

  public toJSON() {
    return {
      name: this.name,
      message: this.message,
      cause: this.cause,
      stack: this.stack,
      data: this.data,
    };
  }
}
