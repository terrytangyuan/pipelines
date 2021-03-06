/*
 * Copyright 2018 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import * as React from 'react';
import ArchiveIcon from '@material-ui/icons/Archive';
import Button from '@material-ui/core/Button';
import ChevronLeftIcon from '@material-ui/icons/ChevronLeft';
import ExperimentsIcon from '../icons/experiments';
import IconButton from '@material-ui/core/IconButton';
import JupyterhubIcon from '@material-ui/icons/Code';
import KubeflowLogo from '../icons/kubeflowLogo';
import OpenInNewIcon from '@material-ui/icons/OpenInNew';
import PipelinesIcon from '../icons/pipelines';
import Tooltip from '@material-ui/core/Tooltip';
import { Apis } from '../lib/Apis';
import { Link } from 'react-router-dom';
import { LocalStorage, LocalStorageKey } from '../lib/LocalStorage';
import { RoutePage } from '../components/Router';
import { RouterProps } from 'react-router';
import { classes, stylesheet } from 'typestyle';
import { fontsize, dimension, commonCss } from '../Css';
import { logger } from '../lib/Utils';

export const sideNavColors = {
  bg: '#0f4471',
  fgActive: '#fff',
  fgActiveInvisible: 'rgb(227, 233, 237, 0)',
  fgDefault: '#87a1b8',
  hover: '#3f698d',
  separator: '#41698d',
};

export const css = stylesheet({
  active: {
    backgroundColor: sideNavColors.hover + ' !important',
    color: sideNavColors.fgActive + ' !important',
  },
  buildInfo: {
    color: sideNavColors.fgDefault,
    marginBottom: 16,
    marginLeft: 30,
  },
  button: {
    borderRadius: dimension.base / 2,
    color: sideNavColors.fgDefault,
    display: 'block',
    fontSize: fontsize.medium,
    fontWeight: 'bold',
    height: dimension.base,
    marginBottom: 16,
    marginLeft: 16,
    maxWidth: 186,
    overflow: 'hidden',
    padding: 10,
    textAlign: 'left',
    textTransform: 'none',
    transition: 'max-width 0.3s',
    whiteSpace: 'nowrap',
    width: 186,
  },
  chevron: {
    color: sideNavColors.fgDefault,
    marginLeft: 16,
    padding: 6,
    transition: 'transform 0.3s',
  },
  collapsedButton: {
    maxWidth: dimension.base,
    minWidth: dimension.base,
    padding: 10,
  },
  collapsedChevron: {
    transform: 'rotate(180deg)',
  },
  collapsedLabel: {
    // Hide text when collapsing, but do it with a transition
    opacity: 0,
  },
  collapsedRoot: {
    width: '72px !important',
  },
  collapsedSeparator: {
    margin: '20px !important',
  },
  infoHidden: {
    opacity: 0,
    transition: 'opacity 0s',
    transitionDelay: '0s',
  },
  infoVisible: {
    opacity: 'initial',
    transition: 'opacity 0.2s',
    transitionDelay: '0.3s',
  },
  label: {
    fontSize: fontsize.base,
    letterSpacing: 0.25,
    marginLeft: 20,
    transition: 'opacity 0.3s',
    verticalAlign: 'super',
  },
  link: {
    color: '#b7d1e8'
  },
  logo: {
    display: 'flex',
    marginBottom: 16,
    marginLeft: '9px !important',

  },
  logoLabel: {
    color: sideNavColors.fgActive,
    display: 'flex',
    flexDirection: 'column',
    fontSize: fontsize.title,
    justifyContent: 'center',
    marginLeft: 12,
  },
  openInNewTabIcon: {
    height: 12,
    marginBottom: 8,
    marginLeft: 5,
    width: 12,
  },
  privacyInfo: {
    color: sideNavColors.fgDefault,
    marginBottom: 6,
    marginLeft: 30,
  },
  privacySeparator: {
    background: sideNavColors.fgDefault,
    borderRadius: 2,
    display: 'inline-block',
    height: 4,
    marginBottom: 3,
    marginLeft: 10,
    marginRight: 10,
    width: 4,
  },
  root: {
    background: sideNavColors.bg,
    paddingTop: 12,
    transition: 'width 0.3s',
    width: 220,
  },
  separator: {
    border: '0px none transparent',
    borderTop: `1px solid ${sideNavColors.separator}`,
    margin: 20,
  },
});

interface DisplayBuildInfo {
  commitHash: string;
  commitUrl: string;
  date: string;
}

interface SideNavProps extends RouterProps {
  page: string;
}

interface SideNavState {
  displayBuildInfo?: DisplayBuildInfo;
  collapsed: boolean;
  jupyterHubAvailable: boolean;
  manualCollapseState: boolean;
}

export default class SideNav extends React.Component<SideNavProps, SideNavState> {
  private _isMounted = true;
  private readonly _AUTO_COLLAPSE_WIDTH = 800;
  private readonly _HUB_ADDRESS = '/hub/';

  constructor(props: any) {
    super(props);

    const collapsed = LocalStorage.isNavbarCollapsed();

    this.state = {
      collapsed,
      jupyterHubAvailable: false,
      manualCollapseState: LocalStorage.hasKey(LocalStorageKey.navbarCollapsed),
    };
  }

  public async componentDidMount(): Promise<void> {
    window.addEventListener('resize', this._maybeResize.bind(this));
    this._maybeResize();

    // Fetch build info
    let displayBuildInfo: DisplayBuildInfo | undefined;
    try {
      const buildInfo = await Apis.getBuildInfo();
      const commitHash = buildInfo.apiServerCommitHash || buildInfo.frontendCommitHash || '';
      displayBuildInfo = {
        commitHash: commitHash ? commitHash.substring(0, 7) : 'unknown',
        commitUrl: 'https://www.github.com/kubeflow/pipelines'
          + (commitHash ? `/commit/${commitHash}` : ''),
        date: buildInfo.buildDate ? new Date(buildInfo.buildDate).toLocaleDateString() : 'unknown',
      };
    } catch (err) {
      logger.error('Failed to retrieve build info', err);
    }

    // Verify Jupyter Hub is reachable
    let jupyterHubAvailable = false;
    try {
      jupyterHubAvailable = await Apis.isJupyterHubAvailable();
    } catch (err) {
      logger.error('Failed to reach Jupyter Hub', err);
    }

    this.setStateSafe({ displayBuildInfo, jupyterHubAvailable });
  }

  public componentWillUnmount(): void {
    this._isMounted = false;
  }

  public render(): JSX.Element {
    const page = this.props.page;
    const { collapsed, displayBuildInfo } = this.state;
    const iconColor = {
      active: sideNavColors.fgActive,
      inactive: sideNavColors.fgDefault,
    };

    return (
      <div id='sideNav' className={classes(css.root, commonCss.flexColumn, commonCss.noShrink, collapsed && css.collapsedRoot)}>
        <div style={{ flexGrow: 1 }}>
          <Tooltip title={'Kubeflow Pipelines'} enterDelay={300} placement={'right'}
            disableFocusListener={!collapsed} disableHoverListener={!collapsed}
            disableTouchListener={!collapsed}>
            <Link id='kfpLogoBtn' to={RoutePage.PIPELINES} className={classes(css.button, collapsed && css.collapsedButton, css.logo, commonCss.unstyled)}>
              <KubeflowLogo color={iconColor.active} style={{ flexShrink: 0 }} />
              <span className={classes(collapsed && css.collapsedLabel, css.label, css.logoLabel)}>
                Kubeflow
              </span>
            </Link>
          </Tooltip>
          <Tooltip title={'Pipeline List'} enterDelay={300} placement={'right-start'}
            disableFocusListener={!collapsed} disableHoverListener={!collapsed}
            disableTouchListener={!collapsed}>
            <Link id='pipelinesBtn' to={RoutePage.PIPELINES} className={commonCss.unstyled}>
              <Button className={classes(css.button,
                page.startsWith(RoutePage.PIPELINES) && css.active,
                collapsed && css.collapsedButton)}>
                <PipelinesIcon color={page.startsWith(RoutePage.PIPELINES) ? iconColor.active : iconColor.inactive} />
                <span className={classes(collapsed && css.collapsedLabel, css.label)}>Pipelines</span>
              </Button>
            </Link>
          </Tooltip>
          <Tooltip title={'Experiment List'} enterDelay={300} placement={'right-start'}
            disableFocusListener={!collapsed} disableHoverListener={!collapsed}
            disableTouchListener={!collapsed}>
            <Link id='experimentsBtn' to={RoutePage.EXPERIMENTS} className={commonCss.unstyled}>
              <Button className={
                classes(
                  css.button,
                  this._highlightExperimentsButton(page) && css.active,
                  collapsed && css.collapsedButton)}>
                <ExperimentsIcon color={this._highlightExperimentsButton(page) ? iconColor.active : iconColor.inactive} />
                <span className={classes(collapsed && css.collapsedLabel, css.label)}>Experiments</span>
              </Button>
            </Link>
          </Tooltip>
          {this.state.jupyterHubAvailable && (
            <Tooltip title={'Open Jupyter Notebook'} enterDelay={300} placement={'right-start'}
              disableFocusListener={!collapsed} disableHoverListener={!collapsed}
              disableTouchListener={!collapsed}>
              <a id='jupyterhubBtn' href={this._HUB_ADDRESS} className={commonCss.unstyled} target='_blank'>
                <Button className={
                  classes(css.button, collapsed && css.collapsedButton)}>
                  <JupyterhubIcon style={{ height: 20, width: 20 }} />
                  <span className={classes(collapsed && css.collapsedLabel, css.label)}>Notebooks</span>
                  <OpenInNewIcon className={css.openInNewTabIcon} />
                </Button>
              </a>
            </Tooltip>
          )}
          <hr className={classes(css.separator, collapsed && css.collapsedSeparator)} />
          <Tooltip title={'Archive'} enterDelay={300} placement={'right-start'}
            disableFocusListener={!collapsed} disableHoverListener={!collapsed}
            disableTouchListener={!collapsed}>
            <Link id='archiveBtn' to={RoutePage.ARCHIVE} className={commonCss.unstyled}>
              <Button className={classes(css.button,
                page === RoutePage.ARCHIVE && css.active,
                collapsed && css.collapsedButton)}>
                <ArchiveIcon style={{ height: 20, width: 20 }} />
                <span className={classes(collapsed && css.collapsedLabel, css.label)}>Archive</span>
              </Button>
            </Link>
          </Tooltip>
          <hr className={classes(css.separator, collapsed && css.collapsedSeparator)} />
          <IconButton className={classes(css.chevron, collapsed && css.collapsedChevron)}
            onClick={this._toggleNavClicked.bind(this)}>
            <ChevronLeftIcon />
          </IconButton>
        </div>
        <div className={collapsed ? css.infoHidden : css.infoVisible}>
          <div className={css.privacyInfo}>
            <span>Privacy</span>
            <span className={css.privacySeparator}/>
            <a href='https://www.kubeflow.org/docs/guides/usage-reporting/'
              className={classes(css.link, commonCss.unstyled)} target='_blank'>
              Usage reporting
            </a>
          </div>
          {displayBuildInfo && (
            <Tooltip title={'Build date: ' + displayBuildInfo.date} enterDelay={300} placement={'top-start'}>
              <div className={css.buildInfo}>
                <span>Build commit: </span>
                <a href={displayBuildInfo.commitUrl} className={classes(css.link, commonCss.unstyled)}
                  target='_blank'>
                  {displayBuildInfo.commitHash}
                </a>
              </div>
            </Tooltip>
          )}
        </div>
      </div >
    );
  }

  private _highlightExperimentsButton(page: string): boolean {
    return page.startsWith(RoutePage.EXPERIMENTS)
      || page.startsWith(RoutePage.RUNS)
      // TODO: Router should have a constant for this, but it doesn't follow the naming convention
      // of the other pages
      || page.startsWith('/recurringrun')
      || page.startsWith(RoutePage.COMPARE);
  }

  private _toggleNavClicked(): void {
    this.setStateSafe({
      collapsed: !this.state.collapsed,
      manualCollapseState: true,
    }, () => LocalStorage.saveNavbarCollapsed(this.state.collapsed));
    this._toggleNavCollapsed();
  }

  private _toggleNavCollapsed(shouldCollapse?: boolean): void {
    this.setStateSafe({
      collapsed: shouldCollapse !== undefined ? shouldCollapse : !this.state.collapsed,
    });
  }

  private _maybeResize(): void {
    if (!this.state.manualCollapseState) {
      this._toggleNavCollapsed(window.innerWidth < this._AUTO_COLLAPSE_WIDTH);
    }
  }

  private setStateSafe(newState: Partial<SideNavState>, cb?: () => void): void {
    if (this._isMounted) {
      this.setState(newState as any, cb);
    }
  }
}
