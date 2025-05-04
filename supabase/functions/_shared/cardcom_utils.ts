
/**
 * Helper function to log steps in edge functions
 */
export async function logStep(
  functionName: string,
  step: string,
  data: any = {}
): Promise<void> {
  const message = `[${functionName}][${step}] ${JSON.stringify(data)}`;
  console.log(message);
}
