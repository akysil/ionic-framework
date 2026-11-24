import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonLabel,
  IonPage,
  IonRouterOutlet,
  IonTabBar,
  IonTabButton,
  IonTabs,
  IonTitle,
  IonToolbar,
  useIonRouter,
} from '@ionic/react';
import React from 'react';
import { Navigate, Route } from 'react-router';

const Page: React.FC<{ tab: string; step: number; last?: boolean }> = ({ tab, step, last }) => {
  const ionRouter = useIonRouter();
  const next = `/replace-tabs/${tab}/${step + 1}`;

  return (
    <IonPage data-pageid={`replace-tabs-${tab}${step}`}>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton />
          </IonButtons>
          <IonTitle>
            Tab {tab.toUpperCase()} page {step}
          </IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        {!last && (
          <IonButton id={`go-to-${tab}${step + 1}`} routerLink={next}>
            Next
          </IonButton>
        )}
        {!last && (
          <IonButton id={`replace-to-${tab}${step + 1}`} onClick={() => ionRouter.push(next, 'forward', 'replace')}>
            Replace with next
          </IonButton>
        )}
      </IonContent>
    </IonPage>
  );
};

const ReplaceTabs: React.FC = () => (
  <IonTabs>
    <IonRouterOutlet id="replace-tabs">
      <Route index element={<Navigate to="/replace-tabs/a" replace />} />
      <Route path="/replace-tabs/a" element={<Page tab="a" step={1} />} />
      <Route path="/replace-tabs/a/2" element={<Page tab="a" step={2} />} />
      <Route path="/replace-tabs/a/3" element={<Page tab="a" step={3} />} />
      <Route path="/replace-tabs/a/4" element={<Page tab="a" step={4} />} />
      <Route path="/replace-tabs/a/5" element={<Page tab="a" step={5} last />} />
      <Route path="/replace-tabs/b" element={<Page tab="b" step={1} />} />
      <Route path="/replace-tabs/b/2" element={<Page tab="b" step={2} />} />
      <Route path="/replace-tabs/b/3" element={<Page tab="b" step={3} last />} />
    </IonRouterOutlet>
    <IonTabBar slot="bottom">
      <IonTabButton tab="replace-tabs-a" href="/replace-tabs/a">
        <IonLabel>Tab A</IonLabel>
      </IonTabButton>
      <IonTabButton tab="replace-tabs-b" href="/replace-tabs/b">
        <IonLabel>Tab B</IonLabel>
      </IonTabButton>
    </IonTabBar>
  </IonTabs>
);

export default ReplaceTabs;
