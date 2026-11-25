import { test, expect } from '@playwright/test';
import {
  ionPageVisible,
  ionPageHidden,
  ionPageDoesNotExist,
  ionBackClick,
  ionNav,
  ionGoBack,
  ionTabClick,
  withTestingMode,
} from './utils/test-utils';

test.describe('Replace History Entries', () => {
  /**
   * Tests that replace navigation does not create duplicate browser history entries
   * when using browser back for all navigation.
   *
   * Flow: home -> page1 -> push page2 -> replace page3 -> browser back -> page1 -> browser back -> home
   */
  test('replace should not create duplicate history entries with browser back', async ({ page }) => {
    await page.goto(withTestingMode('/'));
    await ionPageVisible(page, 'home');

    // Navigate to the replace-action test
    await ionNav(page, 'ion-item', 'Replace Action');
    await ionPageVisible(page, 'page1');

    // Push to page2
    await page.locator('#go-to-page2').click();
    await ionPageVisible(page, 'page2');

    // Replace page2 with page3
    await page.locator('#go-to-page3').click();
    await ionPageVisible(page, 'page3');
    await ionPageDoesNotExist(page, 'page2');

    // Browser back from page3 -> page1 (page2 was replaced)
    await ionGoBack(page, '/replace-action/page1');
    await ionPageVisible(page, 'page1');

    // Browser back from page1 -> home, NOT page1 again
    await ionGoBack(page, '/');
    await ionPageVisible(page, 'home');
  });

  /**
   * Tests that Ionic back button + browser back does not create duplicate entries.
   *
   * The Ionic back button calls handleNavigateBack which may use navigate(-1) or
   * handleNavigate (replace). If it incorrectly uses a replace, the browser history
   * will have page1 twice: once from the original navigation and once from the
   * replace that overwrote page3's entry.
   *
   * Flow: home -> page1 -> push page2 -> replace page3 -> IonBackButton -> page1 -> browser back -> home
   */
  test('ionic back button after replace should not create duplicate history entries', async ({ page }) => {
    await page.goto(withTestingMode('/'));
    await ionPageVisible(page, 'home');

    // Navigate to the replace-action test
    await ionNav(page, 'ion-item', 'Replace Action');
    await ionPageVisible(page, 'page1');

    // Push to page2
    await page.locator('#go-to-page2').click();
    await ionPageVisible(page, 'page2');

    // Replace page2 with page3
    await page.locator('#go-to-page3').click();
    await ionPageVisible(page, 'page3');
    await ionPageDoesNotExist(page, 'page2');

    // Use the IonBackButton (not browser back) from page3
    await ionBackClick(page, 'page3');
    await ionPageVisible(page, 'page1');
    await expect(page).toHaveURL(/\/replace-action\/page1/);

    // Browser back from page1 -> should go to home, NOT page1 again
    await ionGoBack(page);
    // Page1 should no longer be visible - we should be at home
    const url = page.url();
    expect(url).not.toContain('/replace-action/page1');
    await ionPageVisible(page, 'home');
  });

  /**
   * A replace removes only the replaced page. Sibling pages that back can still
   * return to stay mounted, so back shows the same page instead of a new copy.
   *
   * Flow: home -> page1 -> push page2 -> replace page3 -> IonBackButton -> page1
   */
  test('replace should keep the sibling page in back history mounted', async ({ page }) => {
    await page.goto(withTestingMode('/'));
    await ionPageVisible(page, 'home');

    await ionNav(page, 'ion-item', 'Replace Action');
    await ionPageVisible(page, 'page1');
    await page.locator('div.ion-page[data-pageid="page1"]').evaluate((el) => el.setAttribute('data-marker', 'page1'));

    await page.locator('#go-to-page2').click();
    await ionPageVisible(page, 'page2');

    await page.locator('#go-to-page3').click();
    await ionPageVisible(page, 'page3');
    await ionPageDoesNotExist(page, 'page2');
    await page.waitForTimeout(500);
    await ionPageHidden(page, 'page1');

    await ionBackClick(page, 'page3');
    await ionPageVisible(page, 'page1');
    await expect(page.locator('div.ion-page[data-pageid="page1"]')).toHaveAttribute('data-marker', 'page1');
  });

  /**
   * Every page in the back history stays mounted after a replace, not only the
   * page that pushed the replaced one.
   *
   * Flow: home -> page1 -> push page2 -> push page4 -> replace page3 -> back -> page2 -> back -> page1
   */
  test('replace should keep every sibling page in back history mounted', async ({ page }) => {
    await page.goto(withTestingMode('/'));
    await ionPageVisible(page, 'home');

    await ionNav(page, 'ion-item', 'Replace Action');
    await ionPageVisible(page, 'page1');
    await page.locator('div.ion-page[data-pageid="page1"]').evaluate((el) => el.setAttribute('data-marker', 'page1'));

    await page.locator('#go-to-page2').click();
    await ionPageVisible(page, 'page2');
    await page.locator('div.ion-page[data-pageid="page2"]').evaluate((el) => el.setAttribute('data-marker', 'page2'));

    await page.locator('#go-to-page4').click();
    await ionPageVisible(page, 'page4');

    await page.locator('#replace-to-page3').click();
    await ionPageVisible(page, 'page3');
    await ionPageDoesNotExist(page, 'page4');
    await page.waitForTimeout(500);
    await ionPageHidden(page, 'page1');
    await ionPageHidden(page, 'page2');

    await ionBackClick(page, 'page3');
    await ionPageVisible(page, 'page2');
    await expect(page.locator('div.ion-page[data-pageid="page2"]')).toHaveAttribute('data-marker', 'page2');

    await ionBackClick(page, 'page2');
    await ionPageVisible(page, 'page1');
    await expect(page.locator('div.ion-page[data-pageid="page1"]')).toHaveAttribute('data-marker', 'page1');
  });

  /**
   * A pathname that appears twice in the back history does not hide the
   * pages before it. The replaced page4 view also serves the older page4
   * entry, so it stays mounted too.
   *
   * Flow: home -> page1 -> push page2 -> push page4 -> push page2 -> push page4 -> replace page3 -> back x4 -> page1
   */
  test('replace should keep sibling pages mounted when a pathname repeats in back history', async ({ page }) => {
    const pageLocator = (pageId: string) => page.locator(`div.ion-page[data-pageid="${pageId}"]`);
    const visiblePage = (pageId: string) => page.locator(`div.ion-page[data-pageid="${pageId}"]:not(.ion-page-hidden)`);

    await page.goto(withTestingMode('/'));
    await ionPageVisible(page, 'home');

    await ionNav(page, 'ion-item', 'Replace Action');
    await ionPageVisible(page, 'page1');
    await pageLocator('page1').evaluate((el) => el.setAttribute('data-marker', 'page1'));

    await page.locator('#go-to-page2').click();
    await expect(visiblePage('page2')).toBeVisible();
    await visiblePage('page2').locator('#go-to-page4').click();
    await expect(visiblePage('page4')).toBeVisible();
    await pageLocator('page4').evaluate((el) => el.setAttribute('data-marker', 'page4'));
    await visiblePage('page4').locator('#go-to-page2-again').click();
    await expect(visiblePage('page2')).toBeVisible();
    await visiblePage('page2').locator('#go-to-page4').click();
    await expect(visiblePage('page4')).toBeVisible();

    await visiblePage('page4').locator('#replace-to-page3').click();
    await ionPageVisible(page, 'page3');
    // Let the deferred unmounts run before checking which pages are left.
    await page.waitForTimeout(500);
    await ionPageHidden(page, 'page1');
    await ionPageHidden(page, 'page4');

    for (const pageId of ['page3', 'page2', 'page4', 'page2']) {
      await expect(visiblePage(pageId)).toBeVisible();
      if (pageId === 'page4') {
        await expect(pageLocator('page4')).toHaveAttribute('data-marker', 'page4');
      }
      await visiblePage(pageId).locator('ion-back-button').click();
    }
    await ionPageVisible(page, 'page1');
    await expect(pageLocator('page1')).toHaveAttribute('data-marker', 'page1');
  });

  /**
   * A replace to the previous pathname with another query has no back button
   * target, but browser back still returns through the earlier entries.
   *
   * Flow: home -> page1 -> push page2 -> push page4 -> replace page2?from=replace -> browser back x2 -> page1
   */
  test('replace to the previous pathname should keep the pages browser back returns to', async ({ page }) => {
    const page1 = page.locator('div.ion-page[data-pageid="page1"]');

    await page.goto(withTestingMode('/'));
    await ionPageVisible(page, 'home');

    await ionNav(page, 'ion-item', 'Replace Action');
    await ionPageVisible(page, 'page1');
    await page1.evaluate((el) => el.setAttribute('data-marker', 'page1'));

    await page.locator('#go-to-page2').click();
    await ionPageVisible(page, 'page2');
    await page.locator('#go-to-page4').click();
    await ionPageVisible(page, 'page4');

    await page.locator('#replace-to-page2-query').click();
    await ionPageVisible(page, 'page2');
    await expect(page).toHaveURL(/\/replace-action\/page2\?from=replace/);
    // Let the deferred unmounts run before checking which pages are left.
    await page.waitForTimeout(500);
    await ionPageDoesNotExist(page, 'page4');
    await ionPageHidden(page, 'page1');

    await ionGoBack(page);
    await expect(page).toHaveURL(/\/replace-action\/page2$/);
    await ionPageVisible(page, 'page2');
    await ionGoBack(page, '/replace-action/page1');
    await ionPageVisible(page, 'page1');
    await expect(page1).toHaveAttribute('data-marker', 'page1');
  });

  /**
   * A second replace inherits the missing pushedByRoute of the first one, but
   * browser back still returns through the earlier entries.
   *
   * Flow: page1 -> push page2 -> push page4 -> replace page2?from=replace -> replace page3 -> browser back x2 -> page1
   */
  test('consecutive replaces should keep the pages browser back returns to', async ({ page }) => {
    const page1 = page.locator('div.ion-page[data-pageid="page1"]');
    const page2 = page.locator('div.ion-page[data-pageid="page2"]');

    await page.goto(withTestingMode('/'));
    await ionPageVisible(page, 'home');

    await ionNav(page, 'ion-item', 'Replace Action');
    await ionPageVisible(page, 'page1');
    await page1.evaluate((el) => el.setAttribute('data-marker', 'page1'));

    await page.locator('#go-to-page2').click();
    await ionPageVisible(page, 'page2');
    await page2.evaluate((el) => el.setAttribute('data-marker', 'page2'));
    await page.locator('#go-to-page4').click();
    await ionPageVisible(page, 'page4');

    await page.locator('#replace-to-page2-query').click();
    await ionPageVisible(page, 'page2');
    await expect(page).toHaveURL(/\/replace-action\/page2\?from=replace/);
    await page.locator('#go-to-page3').click();
    await ionPageVisible(page, 'page3');
    // Let the deferred unmounts run before checking which pages are left.
    await page.waitForTimeout(500);
    await ionPageHidden(page, 'page1');
    await ionPageHidden(page, 'page2');

    await ionGoBack(page, '/replace-action/page2');
    await ionPageVisible(page, 'page2');
    await expect(page2).toHaveAttribute('data-marker', 'page2');
    await ionGoBack(page, '/replace-action/page1');
    await ionPageVisible(page, 'page1');
    await expect(page1).toHaveAttribute('data-marker', 'page1');
  });

  /**
   * A push between the replaces does not restore the missing pushedByRoute,
   * and browser back still returns through the earlier entries.
   *
   * Flow: page1 -> push page2 -> push page4 -> replace page2?from=replace -> push page4 -> replace page3 -> browser back x3 -> page1
   */
  test('replace after a push that follows a replace should keep the pages browser back returns to', async ({ page }) => {
    const page1 = page.locator('div.ion-page[data-pageid="page1"]');
    const page2 = page.locator('div.ion-page[data-pageid="page2"]');

    await page.goto(withTestingMode('/'));
    await ionPageVisible(page, 'home');

    await ionNav(page, 'ion-item', 'Replace Action');
    await ionPageVisible(page, 'page1');
    await page1.evaluate((el) => el.setAttribute('data-marker', 'page1'));

    await page.locator('#go-to-page2').click();
    await ionPageVisible(page, 'page2');
    await page2.evaluate((el) => el.setAttribute('data-marker', 'page2'));
    await page.locator('#go-to-page4').click();
    await ionPageVisible(page, 'page4');

    await page.locator('#replace-to-page2-query').click();
    await ionPageVisible(page, 'page2');
    await expect(page).toHaveURL(/\/replace-action\/page2\?from=replace/);
    await page.locator('#go-to-page4').click();
    await ionPageVisible(page, 'page4');
    await page.locator('#replace-to-page3').click();
    await ionPageVisible(page, 'page3');
    // Let the deferred unmounts run before checking which pages are left.
    await page.waitForTimeout(500);
    await ionPageHidden(page, 'page1');
    await ionPageHidden(page, 'page2');

    await ionGoBack(page, '/replace-action/page2?from=replace');
    await ionPageVisible(page, 'page2');
    await ionGoBack(page);
    await expect(page).toHaveURL(/\/replace-action\/page2$/);
    await ionPageVisible(page, 'page2');
    await expect(page2).toHaveAttribute('data-marker', 'page2');
    await ionGoBack(page, '/replace-action/page1');
    await ionPageVisible(page, 'page1');
    await expect(page1).toHaveAttribute('data-marker', 'page1');
  });

  /**
   * Browser back from a replaced entry restores an entry that locationHistory
   * no longer links to its predecessor. A replace from there still keeps the
   * pages browser back returns to.
   *
   * Flow: page1 -> push page2 -> push page4 -> replace page2?from=replace -> browser back -> page2 -> replace page3 -> browser back -> page1
   */
  test('replace after browser back to a replaced entry should keep the pages browser back returns to', async ({
    page,
  }) => {
    const page1 = page.locator('div.ion-page[data-pageid="page1"]');

    await page.goto(withTestingMode('/'));
    await ionPageVisible(page, 'home');

    await ionNav(page, 'ion-item', 'Replace Action');
    await ionPageVisible(page, 'page1');
    await page1.evaluate((el) => el.setAttribute('data-marker', 'page1'));

    await page.locator('#go-to-page2').click();
    await ionPageVisible(page, 'page2');
    await page.locator('#go-to-page4').click();
    await ionPageVisible(page, 'page4');
    await page.locator('#replace-to-page2-query').click();
    await ionPageVisible(page, 'page2');
    await expect(page).toHaveURL(/\/replace-action\/page2\?from=replace/);

    await ionGoBack(page);
    await expect(page).toHaveURL(/\/replace-action\/page2$/);
    await ionPageVisible(page, 'page2');

    await page.locator('#go-to-page3').click();
    await ionPageVisible(page, 'page3');
    // Let the deferred unmounts run before checking which pages are left.
    await page.waitForTimeout(500);
    await ionPageDoesNotExist(page, 'page2');
    await ionPageHidden(page, 'page1');

    await ionGoBack(page, '/replace-action/page1');
    await ionPageVisible(page, 'page1');
    await expect(page1).toHaveAttribute('data-marker', 'page1');
  });

  /**
   * Back in another tab can drop a page from the global history while the
   * page's own tab history still holds it. Back uses the tab history first,
   * so the page stays mounted after a replace.
   *
   * Flow: b1 -> b2 -> b3 -> tab A -> a2 -> a3 -> tab B -> back x2 -> tab A -> a4 -> replace a5 -> back -> a3 -> back -> a2
   */
  test('replace should keep sibling pages mounted that tab history can return to', async ({ page }) => {
    const pageLocator = (pageId: string) => page.locator(`div.ion-page[data-pageid="replace-tabs-${pageId}"]`);

    await page.goto(withTestingMode('/replace-tabs/b'));
    await ionPageVisible(page, 'replace-tabs-b1');
    await page.locator('#go-to-b2').click();
    await ionPageVisible(page, 'replace-tabs-b2');
    await page.locator('#go-to-b3').click();
    await ionPageVisible(page, 'replace-tabs-b3');

    await ionTabClick(page, 'Tab A');
    await ionPageVisible(page, 'replace-tabs-a1');
    await page.locator('#go-to-a2').click();
    await ionPageVisible(page, 'replace-tabs-a2');
    await pageLocator('a2').evaluate((el) => el.setAttribute('data-marker', 'a2'));
    await page.locator('#go-to-a3').click();
    await ionPageVisible(page, 'replace-tabs-a3');

    await ionTabClick(page, 'Tab B');
    await ionPageVisible(page, 'replace-tabs-b3');
    await ionBackClick(page, 'replace-tabs-b3');
    await ionPageVisible(page, 'replace-tabs-b2');
    await ionBackClick(page, 'replace-tabs-b2');
    await ionPageVisible(page, 'replace-tabs-b1');

    await ionTabClick(page, 'Tab A');
    await ionPageVisible(page, 'replace-tabs-a3');
    await page.locator('#go-to-a4').click();
    await ionPageVisible(page, 'replace-tabs-a4');
    await page.locator('#replace-to-a5').click();
    await ionPageVisible(page, 'replace-tabs-a5');
    await ionPageDoesNotExist(page, 'replace-tabs-a4');
    // Let the deferred sibling cleanup run before checking that a2 is still there.
    await page.waitForTimeout(500);
    await ionPageHidden(page, 'replace-tabs-a2');

    await ionBackClick(page, 'replace-tabs-a5');
    await ionPageVisible(page, 'replace-tabs-a3');
    await ionBackClick(page, 'replace-tabs-a3');
    await ionPageVisible(page, 'replace-tabs-a2');
    await expect(pageLocator('a2')).toHaveAttribute('data-marker', 'a2');
  });

  /**
   * After browser back and forward, Ionic back can return to a page that is
   * ahead of the current browser entry. A replace keeps that page mounted.
   *
   * Flow: a1 -> a2 -> a3 -> back x2 -> browser forward -> a3 -> browser back -> a1 -> replace a2 -> back -> a3
   */
  test('replace should keep the page that ionic back returns to mounted', async ({ page }) => {
    const a3 = page.locator('div.ion-page[data-pageid="replace-tabs-a3"]');

    await page.goto(withTestingMode('/replace-tabs/a'));
    await ionPageVisible(page, 'replace-tabs-a1');
    await page.locator('#go-to-a2').click();
    await ionPageVisible(page, 'replace-tabs-a2');
    await page.locator('#go-to-a3').click();
    await ionPageVisible(page, 'replace-tabs-a3');
    await ionBackClick(page, 'replace-tabs-a3');
    await ionPageVisible(page, 'replace-tabs-a2');
    await ionBackClick(page, 'replace-tabs-a2');
    await ionPageVisible(page, 'replace-tabs-a1');

    // The second back replaced the a2 entry with a1, so forward returns to a3.
    await page.goForward();
    await page.waitForTimeout(500);
    await ionPageVisible(page, 'replace-tabs-a3');
    await a3.evaluate((el) => el.setAttribute('data-marker', 'a3'));
    await page.goBack();
    await page.waitForTimeout(500);
    await ionPageVisible(page, 'replace-tabs-a1');

    await page.locator('#replace-to-a2').click();
    await ionPageVisible(page, 'replace-tabs-a2');
    // Let the deferred cleanup run before checking that a3 is still there.
    await page.waitForTimeout(500);
    await ionPageHidden(page, 'replace-tabs-a3');

    await ionBackClick(page, 'replace-tabs-a2');
    await ionPageVisible(page, 'replace-tabs-a3');
    await expect(a3).toHaveAttribute('data-marker', 'a3');
  });

  /**
   * Successive Ionic backs can return to pages outside the earlier browser
   * entries. A replace keeps all of them mounted.
   *
   * Flow: a1 -> a2 -> a3 -> a4 -> tab B -> tab A -> browser back -> browser go(-2) -> a3 -> replace a4 -> back -> a3 -> back -> a2
   */
  test('replace should keep the pages that successive ionic backs return to mounted', async ({ page }) => {
    const a2 = page.locator('div.ion-page[data-pageid="replace-tabs-a2"]');

    await page.goto(withTestingMode('/replace-tabs/a'));
    await ionPageVisible(page, 'replace-tabs-a1');
    await page.locator('#go-to-a2').click();
    await ionPageVisible(page, 'replace-tabs-a2');
    await a2.evaluate((el) => el.setAttribute('data-marker', 'a2'));
    await page.locator('#go-to-a3').click();
    await ionPageVisible(page, 'replace-tabs-a3');
    await page.locator('#go-to-a4').click();
    await ionPageVisible(page, 'replace-tabs-a4');

    await ionTabClick(page, 'Tab B');
    await ionPageVisible(page, 'replace-tabs-b1');
    await ionTabClick(page, 'Tab A');
    await ionPageVisible(page, 'replace-tabs-a4');

    await page.goBack();
    await page.waitForTimeout(500);
    await page.evaluate(() => window.history.go(-2));
    await page.waitForTimeout(500);
    await ionPageVisible(page, 'replace-tabs-a3');

    await page.locator('#replace-to-a4').click();
    await ionPageVisible(page, 'replace-tabs-a4');
    // Let the deferred cleanup run before checking that a2 is still there.
    await page.waitForTimeout(500);
    await ionPageHidden(page, 'replace-tabs-a2');

    await ionBackClick(page, 'replace-tabs-a4');
    await ionPageVisible(page, 'replace-tabs-a3');
    await ionBackClick(page, 'replace-tabs-a3');
    await ionPageVisible(page, 'replace-tabs-a2');
    await expect(a2).toHaveAttribute('data-marker', 'a2');
  });

  /**
   * A forward push to a <Navigate replace> route replaces only the redirect
   * entry, so the page that pushed it stays mounted.
   *
   * Flow: home -> page1 -> push page2 -> push alias -> redirect page3 -> back -> page2
   */
  test('redirect after a forward push should keep the pushing page mounted', async ({ page }) => {
    const page2 = page.locator('div.ion-page[data-pageid="page2"]');

    await page.goto(withTestingMode('/'));
    await ionPageVisible(page, 'home');

    await ionNav(page, 'ion-item', 'Replace Action');
    await ionPageVisible(page, 'page1');
    await page.locator('#go-to-page2').click();
    await ionPageVisible(page, 'page2');
    await page2.evaluate((el) => el.setAttribute('data-marker', 'page2'));

    await page.locator('#go-to-alias').click();
    await ionPageVisible(page, 'page3');
    // Let the deferred unmounts run before checking that page2 is still there.
    await page.waitForTimeout(500);
    await ionPageHidden(page, 'page2');

    await ionBackClick(page, 'page3');
    await ionPageVisible(page, 'page2');
    await expect(page2).toHaveAttribute('data-marker', 'page2');
  });

  /**
   * Tests browser forward still works after going back from a replaced page.
   * This verifies navigate(-1) is used (not replace) for the back navigation.
   */
  test('browser forward should work after going back from replaced page', async ({ page }) => {
    await page.goto(withTestingMode('/'));
    await ionPageVisible(page, 'home');

    await ionNav(page, 'ion-item', 'Replace Action');
    await ionPageVisible(page, 'page1');

    await page.locator('#go-to-page2').click();
    await ionPageVisible(page, 'page2');

    await page.locator('#go-to-page3').click();
    await ionPageVisible(page, 'page3');
    await ionPageDoesNotExist(page, 'page2');

    // Browser back -> page1
    await ionGoBack(page, '/replace-action/page1');
    await ionPageVisible(page, 'page1');

    // Browser forward -> page3 (forward history should be preserved)
    await page.goForward();
    await page.waitForTimeout(500);
    await ionPageVisible(page, 'page3');
  });

  /**
   * Tests the "Replace to Page1" button on Page3 which uses ionRouter.push
   * with routeAction='replace'. This goes through handleNavigate() rather than
   * React Router's navigate() directly.
   *
   * Flow: home -> page1 -> page2 -> replace page3 -> replace back to page1 -> browser back -> home
   */
  test('ionRouter.push with replace should not create duplicate history entries', async ({ page }) => {
    // Note: NOT using withTestingMode() - search params interfere with replace-to-existing
    await page.goto('/');
    await ionPageVisible(page, 'home');

    await ionNav(page, 'ion-item', 'Replace Action');
    await ionPageVisible(page, 'page1');

    // Push to page2
    await page.locator('#go-to-page2').click();
    await ionPageVisible(page, 'page2');

    // Replace page2 with page3
    await page.locator('#go-to-page3').click();
    await ionPageVisible(page, 'page3');
    await ionPageDoesNotExist(page, 'page2');

    // Replace page3 back to page1 using ionRouter.push
    await page.locator('#replace-to-page1').click();
    await page.waitForTimeout(500);
    await ionPageVisible(page, 'page1');
    await expect(page).toHaveURL(/\/replace-action\/page1/);

    // Browser back from page1 should go to home, NOT page1 again.
    // If replace creates duplicates, browser history would be:
    // [home, page1, page1] (page1 at its original slot + page1 replacing page3)
    await page.goBack();
    await page.waitForTimeout(500);

    const url = page.url();
    expect(url).not.toContain('/replace-action');
    await ionPageVisible(page, 'home');
  });

  /**
   * Regression test: revisiting a Navigate-replace redirect route after the pop-preserve
   * path kept the target view alive must not unmount that view mid-transition.
   *
   * Flow: home -> /replace-action (redirects to page1) -> page2 -> page3 -> back -> back (home) -> revisit /replace-action
   *
   * Without the re-entry guard on the delayed unmount, page1 is removed from the DOM
   * after the second redirect completes, leaving a blank outlet.
   */
  test('revisiting a navigate-replace redirect after back should keep target page mounted', async ({ page }) => {
    await page.goto(withTestingMode('/'));
    await ionPageVisible(page, 'home');

    await ionNav(page, 'ion-item', 'Replace Action');
    await ionPageVisible(page, 'page1');

    await page.locator('#go-to-page2').click();
    await ionPageVisible(page, 'page2');

    await page.locator('#go-to-page3').click();
    await ionPageVisible(page, 'page3');

    await ionBackClick(page, 'page3');
    await ionPageVisible(page, 'page1');

    await ionBackClick(page, 'page1');
    await ionPageVisible(page, 'home');

    // Revisit the replace-action route. page1 was kept alive by pop-preserve and must
    // survive the push-cleanup path once the Navigate replace re-enters it.
    await ionNav(page, 'ion-item', 'Replace Action');
    await ionPageVisible(page, 'page1');

    // Wait past the 250ms unmount delay and assert page1 is still present.
    await page.waitForTimeout(500);
    await ionPageVisible(page, 'page1');
  });

  /**
   * Tests replace with animations enabled (no ionic:_testing=true).
   * Animation timing can affect how history entries are processed.
   */
  test('replace should not create duplicate history entries with animations', async ({ page }) => {
    await page.goto('/');
    await ionPageVisible(page, 'home');

    await ionNav(page, 'ion-item', 'Replace Action');
    await ionPageVisible(page, 'page1');

    await page.locator('#go-to-page2').click();
    await ionPageVisible(page, 'page2');

    await page.locator('#go-to-page3').click();
    await ionPageVisible(page, 'page3');

    // Wait for replace animation and cleanup
    await page.waitForTimeout(500);
    await ionPageDoesNotExist(page, 'page2');

    // Browser back from page3 -> page1
    await page.goBack();
    await page.waitForTimeout(500);
    await ionPageVisible(page, 'page1');

    // Browser back from page1 -> home (not page1 again)
    await page.goBack();
    await page.waitForTimeout(500);
    await ionPageVisible(page, 'home');
  });
});
