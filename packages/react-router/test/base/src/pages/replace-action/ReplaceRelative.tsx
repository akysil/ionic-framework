import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonPage,
  IonRouterOutlet,
  IonTitle,
  IonToolbar,
  useIonRouter,
} from '@ionic/react';
import React from 'react';
import { Route } from 'react-router-dom';

const Page: React.FC<{ step: number }> = ({ step }) => {
  const ionRouter = useIonRouter();
  const next = `/replace-relative/page${step + 1}`;

  return (
    <IonPage data-pageid={`replace-relative-page${step}`}>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton />
          </IonButtons>
          <IonTitle>Relative page {step}</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <IonButton id={`relative-go-to-page${step + 1}`} routerLink={next}>
          Next
        </IonButton>
        <IonButton id={`relative-replace-to-page${step + 1}`} onClick={() => ionRouter.push(next, 'forward', 'replace')}>
          Replace with next
        </IonButton>
      </IonContent>
    </IonPage>
  );
};

/**
 * Sibling routes declared with relative paths in a nested outlet.
 */
const ReplaceRelative: React.FC = () => (
  <IonRouterOutlet>
    <Route path="page1" element={<Page step={1} />} />
    <Route path="page2" element={<Page step={2} />} />
    <Route path="page3" element={<Page step={3} />} />
    <Route path="page4" element={<Page step={4} />} />
  </IonRouterOutlet>
);

export default ReplaceRelative;
