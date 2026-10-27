/** The actual lethal super, retained after its caster recovers or leaves a form. */
export interface Finisher {
  side: number;
  attack: string;
  character: number;
  penguin: boolean;
  stageForm: boolean;
}
