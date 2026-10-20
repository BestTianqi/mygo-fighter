"""Interact with the compact game's settings through its visible controls."""


def open_settings(page):
    if not page.locator('#settings-dialog').evaluate('(dialog) => dialog.open'):
        page.click('#menu-settings' if page.locator('#main-menu').is_visible() else '#settings')


def select_game_option(page, selector, value):
    open_settings(page)
    page.select_option(selector, value)


def start_match(page):
    open_settings(page)
    page.click('#start')


def show_help(page):
    open_settings(page)
    page.click('#help')


def close_help(page):
    page.click('#close-help')
    page.clock.run_for(50)
    page.click('#close-settings')
