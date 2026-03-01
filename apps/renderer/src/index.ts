import { Composition } from 'remotion';

import { TemplateOne } from './compositions/TemplateOne';

export const RemotionRoot = () => {
  return (
    <Composition
      id="TemplateOne"
      component={TemplateOne}
      durationInFrames={150}
      fps={30}
      width={1080}
      height={1920}
    />
  );
};
