"""Interact with the compact game's settings through its visible controls."""
import time


def set_game_sound(page, enabled):
    expected = str(enabled).lower()
    if page.locator('#sound').get_attribute('aria-pressed') != expected:
        page.click('#sound')
    deadline = time.monotonic() + 30
    while page.locator('#sound').get_attribute('aria-pressed') != expected:
        assert time.monotonic() < deadline, 'Sound setting did not apply'
        time.sleep(.025)


def open_settings(page):
    if page.locator('#character-select').is_visible():
        page.click('#selection-back')
    if not page.locator('#settings-dialog').evaluate('(dialog) => dialog.open'):
        page.click('#menu-settings' if page.locator('#main-menu').is_visible() else '#settings')


def select_game_option(page, selector, value):
    open_settings(page)
    page.select_option(selector, value)


def finish_character_selection(page, teams=None):
    if not page.locator('#character-select').is_visible():
        return
    if teams is None:
        assert page.locator('#selection-format').input_value() == '1v1', '3v3 requires explicit test lineups'
        teams = [[int(page.locator('#player-character').input_value())], [int(page.locator('#opponent-character').input_value())]]
    for side, team in enumerate(teams):
        for slot, character in enumerate(team):
            page.click(f'.selection-slot-pick[data-side="{side}"][data-slot="{slot}"]')
            page.click(f'.selection-character[data-character="{character}"]')
    page.click('#selection-confirm')
    deadline = time.monotonic() + 60
    while time.monotonic() < deadline:
        if page.evaluate('document.querySelector("#loading").hidden&&!document.querySelector("#battle-screen").hidden'):
            return
        time.sleep(.025)
    raise AssertionError('Selected characters did not finish loading')


def start_match(page, teams=None):
    open_settings(page)
    page.click('#start')
    finish_character_selection(page, teams)


def show_help(page):
    open_settings(page)
    page.click('#help')


def close_help(page):
    page.click('#close-help')
    page.clock.run_for(50)
    page.click('#close-settings')
