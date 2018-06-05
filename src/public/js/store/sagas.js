import every from 'lodash/every';
import { put, takeEvery, select, all } from 'redux-saga/effects';
import { ACTIONS as DATA_BUS_ACTIONS } from '../components/data-bus/store/constants';
import {
    calcFilesTreeLayoutNodes,
    openAllFolders,
    closeAllFolders,
    setDependenciesEntryPoint
} from '../components/data-bus/store/actions';

import {
    ACTIONS as SWITCHES_ACTIONS,
    CONTROLS_KEYS
} from '../components/controls/ViewSwitches/store/constants';
import {
    setHiddenControl,
    toggleSwitch
} from '../components/controls/ViewSwitches/store/actions';

function* reactOnSwitchToggle(action) {
    const { switchKey } = action.payload;

    if (switchKey === CONTROLS_KEYS.CODE_CRUMBS) {
        yield put(calcFilesTreeLayoutNodes());
    }
}

function* reactOnButtonAction(action) {
    const buttonKey = action.payload;

    if (buttonKey === CONTROLS_KEYS.SOURCE_EXPAND_ALL) {
        return yield all([
            put(setHiddenControl(CONTROLS_KEYS.SOURCE_COLLAPSE_TO_MIN)),
            put(openAllFolders()),
            put(calcFilesTreeLayoutNodes())
        ]);
    }

    if (buttonKey === CONTROLS_KEYS.SOURCE_COLLAPSE_TO_MIN) {
        return yield all([
            put(setHiddenControl(CONTROLS_KEYS.SOURCE_EXPAND_ALL)),
            put(closeAllFolders()),
            put(calcFilesTreeLayoutNodes())
        ]);
    }

    if (buttonKey === CONTROLS_KEYS.DEPENDENCIES_SHOW_ALL) {
        return yield all([
            put(toggleSwitch(CONTROLS_KEYS.DEPENDENCIES_SHOW_ONE_MODULE)),
            put(setDependenciesEntryPoint(null))
        ]);
    }
}

function* reactOnToggledFolder(action) {
    const dataBusState = yield select(state => state.dataBus);
    const { closedFolders, firstLevelFolders } = dataBusState;

    yield all([
        put(
            setHiddenControl(
                CONTROLS_KEYS.SOURCE_EXPAND_ALL,
                every(Object.keys(closedFolders), item => !closedFolders[item])
            )
        ),

        put(
            setHiddenControl(
                CONTROLS_KEYS.SOURCE_COLLAPSE_TO_MIN,
                every(
                    Object.keys(firstLevelFolders),
                    item => closedFolders[item]
                )
            )
        )
    ]);

    yield put(calcFilesTreeLayoutNodes());
}

function* reactDependenciesEntryPointChange(action) {
    if (!action.payload) {
        return yield put(
            setHiddenControl(CONTROLS_KEYS.DEPENDENCIES_SHOW_ALL, true)
        );
    }

    const dependenciesRootEntryPoint = yield select(
        state => state.dataBus.dependenciesRootEntryPoint
    );
    const dependenciesShowOneModule = yield select(
        state => state.viewSwitches.checkedState.dependenciesShowOneModule
    );

    const isRootPoint =
        action.payload.path === dependenciesRootEntryPoint.moduleName;

    yield put(
        setHiddenControl(
            CONTROLS_KEYS.DEPENDENCIES_SHOW_ALL,
            isRootPoint && !dependenciesShowOneModule
        )
    );
}

export default function* rootSaga() {
    yield all([
        takeEvery(SWITCHES_ACTIONS.TOGGLE_SWITCH, reactOnSwitchToggle),
        takeEvery(SWITCHES_ACTIONS.FIRE_BUTTON_ACTION, reactOnButtonAction),
        takeEvery(DATA_BUS_ACTIONS.TOGGLE_FOLDER, reactOnToggledFolder),
        takeEvery(
            DATA_BUS_ACTIONS.SET_DEPENDENCIES_ENTRY_POINT,
            reactDependenciesEntryPointChange
        )
    ]);
}