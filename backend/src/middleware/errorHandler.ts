import { Request, Response, NextFunction } from 'express';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  console.error('Error:', err);

  if (err instanceof Error) {
    res.status(500).json({
      message: 'Internal Server Error',
      error: err.message
    });
    return;
  }

  res.status(500).json({
    message: 'Internal Server Error',
    error: 'An unknown error occurred'
  });
};
