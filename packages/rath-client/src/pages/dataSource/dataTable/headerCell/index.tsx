import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import styled from 'styled-components';
import intl from 'react-intl-universal';
import { runInAction } from 'mobx';
import { IAnalyticType, ISemanticType } from 'visual-insights';
import { Callout, IconButton, PrimaryButton, TextField } from '@fluentui/react';
import { useId } from '@fluentui/react-hooks';
import DistributionChart from '../../metaView/distChart';
import DropdownSelect from '../../../../components/dropDownSelect';
import { FieldExtSuggestion, IFieldMeta, IRawField } from '../../../../interfaces';
import { LiveContainer } from '../../metaView/metaList';
import FieldExtSuggestions from '../../../../components/fieldExtend/suggestions';
import { getGlobalStore } from '../../../../store';
import { PIVOT_KEYS } from '../../../../constants';
import StatTable from './liteStatTable';
import StatePlaceholder from './statePlaceholder';

const HeaderCellContainer = styled.div<{ isPreview: boolean }>`
    .others {
        position: relative;
        padding: 12px;
    }
    .bottom-bar {
        position: absolute;
        height: 4px;
        left: 0px;
        right: 0px;
        top: 0px;
    }
    .info-container {
        min-height: 50px;
    }
    .viz-container {
        height: 100px;
        overflow: hidden;
    }
    .dim {
        background-color: #1890ff;
    }
    .mea {
        background-color: #13c2c2;
    }
    .disable {
        background-color: #9e9e9e;
    }
    .header-row {
        display: flex;
        flex-wrap: nowrap;
        .header {
            margin-top: 0px;
            margin-bottom: 0px;
            font-size: 18px;
            font-weight: 500;
            line-height: 36px;
            flex-grow: 1;
            max-width: 160px;
            overflow: hidden;
            white-space: nowrap;
            text-overflow: ellipsis;
        }
        .edit-icon {
            flex-shrink: 0;
            flex-grow: 0;
        }
    }
    .checkbox-container {
        display: flex;
        align-items: center;
        margin-top: 2px;
        label {
            margin-right: 6px;
        }
    }
`;

function getClassName(type: 'dimension' | 'measure', disable: boolean) {
    if (disable) return 'disable';
    return type === 'dimension' ? 'dim' : 'mea';
}

interface HeaderCellProps {
    name: string;
    code: string;
    disable: boolean;
    onChange?: (fid: string, propKey: keyof IRawField, value: any) => void;
    meta: IFieldMeta | null;
    extSuggestions: FieldExtSuggestion[];
    isExt: boolean;
    isPreview: boolean;
}

interface IOption<T = string> {
    key: T;
    text: string;
}

const DataTypeOptions: IOption<ISemanticType>[] = [
    { key: 'nominal', text: 'nominal' },
    { key: 'ordinal', text: 'ordinal' },
    { key: 'quantitative', text: 'quantitative' },
    { key: 'temporal', text: 'temporal' },
];

function useBIFieldTypeOptions(): IOption<IAnalyticType>[] {
    const dimensionLabel = intl.get('meta.dimension');
    const measureLabel = intl.get('meta.measure');
    const options = useMemo<IOption<IAnalyticType>[]>(() => {
        return [
            { key: 'dimension', text: dimensionLabel },
            { key: 'measure', text: measureLabel },
        ];
    }, [dimensionLabel, measureLabel]);
    return options;
}

function useFocus () {
    const [focus, setFocus] = useState<boolean>(false);
    const endFocus = useCallback((e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
        e.stopPropagation();
        setFocus(false);
    }, [])
    const startFocus = useCallback((e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
        e.stopPropagation();
        setFocus(true);
    }, [])
    const toggleFocus = useCallback<React.TouchEventHandler<HTMLDivElement>>((e) => {
        e.stopPropagation();
        setFocus(v => !v);
    }, [])
    return { focus, endFocus, startFocus, toggleFocus, setFocus }
}

const HeaderCell: React.FC<HeaderCellProps> = (props) => {
    const { dataSourceStore, commonStore, semiAutoStore } = getGlobalStore();
    const { name, code, meta, disable, isPreview, onChange, extSuggestions, isExt } = props;
    const [showNameEditor, setShowNameEditor] = useState<boolean>(false);
    const [headerName, setHeaderName] = useState<string>(name);
    const { focus, endFocus, startFocus, toggleFocus, setFocus } = useFocus();
    const optionsOfBIFieldType = useBIFieldTypeOptions();
    const buttonId = useId('edit-button');
    const canDelete = !isPreview && isExt;
    const intRef = useRef<number>(-1);

    useEffect(() => {
        if (focus) {
            intRef.current = window.setTimeout(() => {
                setFocus(false);
            }, 5000);
        }
        return () => {
            clearInterval(intRef.current);
        };
    }, [focus, setFocus]);

    useEffect(() => {
        setHeaderName(name);
    }, [name]);
    return (
        <HeaderCellContainer
            isPreview={isPreview}
            onMouseOver={startFocus}
            onMouseLeave={endFocus}
            onTouchStart={toggleFocus}
        >
            <StatePlaceholder
                preview={isPreview}
                onAcceptExtField={() => dataSourceStore.settleExtField(code)}
                onRejectExtField={() => dataSourceStore.deleteExtField(code)}
            />
            <div className="others">
                <div className={`bottom-bar ${getClassName(meta?.analyticType || 'dimension', disable)}`}></div>
                <div className="info-container">
                    <div className="header-row">
                        <h3 className="header">
                            {meta && meta.geoRole !== 'none' && <IconButton iconProps={{ iconName: 'globe', style: { fontSize: '12px' } }} />}
                            {name}
                        </h3>
                        {isPreview || (
                            <>
                                <div className="edit-icon">
                                    {focus && (
                                        <IconButton
                                            title={intl.get('dataSource.editName')}
                                            id={buttonId}
                                            iconProps={{ iconName: 'edit', style: { fontSize: '12px' } }}
                                            onClick={() => {
                                                setShowNameEditor(true);
                                            }}
                                        />
                                    )}
                                    {meta && (
                                        <IconButton
                                            title={intl.get('dataSource.statViewInfo.explore')}
                                            iconProps={{ iconName: 'Lightbulb' }}
                                            onClick={() => {
                                                runInAction(() => {
                                                    commonStore.setAppKey(PIVOT_KEYS.semiAuto);
                                                    semiAutoStore.clearMainView();
                                                    semiAutoStore.updateMainView({
                                                        fields: [meta],
                                                        imp: meta.features.entropy,
                                                    });
                                                });
                                            }}
                                        />
                                    )}
                                </div>
                                {extSuggestions.length > 0 && (
                                    <LiveContainer
                                        style={{
                                            transform: 'scale(0.75)',
                                            margin: '-4px -18px',
                                            flexShrink: 0,
                                        }}
                                    >
                                        <FieldExtSuggestions fid={code} suggestions={extSuggestions} />
                                        <div className="badge">{extSuggestions.length}</div>
                                    </LiveContainer>
                                )}
                                {canDelete && (
                                    <IconButton
                                        iconProps={{
                                            iconName: 'Delete',
                                            style: {
                                                color: '#c50f1f',
                                            },
                                        }}
                                        onClick={() => dataSourceStore.deleteExtField(code)}
                                    />
                                )}
                            </>
                        )}
                    </div>
                    {showNameEditor && (
                        <Callout
                            target={`#${buttonId}`}
                            onDismiss={() => {
                                setShowNameEditor(false);
                            }}
                        >
                            <div className="p-4">
                                <h1 className="text-xl">{intl.get('dataSource.table.edit')}</h1>
                                <div className="p-4">
                                    <TextField
                                        label={intl.get('dataSource.table.fieldName')}
                                        value={headerName}
                                        onChange={(e, val) => {
                                            setHeaderName(`${val}`);
                                        }}
                                    />
                                </div>
                                <div className="p-4">
                                    <PrimaryButton
                                        text={intl.get('function.confirm')}
                                        onClick={() => {
                                            onChange && onChange(code, 'name', headerName);
                                            setShowNameEditor(false);
                                        }}
                                    />
                                </div>
                            </div>
                        </Callout>
                    )}
                </div>
                <div className="viz-container">
                    {meta && (
                        <DistributionChart
                            label={false}
                            dataSource={meta.distribution}
                            x="memberName"
                            y="count"
                            analyticType={meta.analyticType}
                            semanticType={meta.semanticType}
                        />
                    )}
                </div>
                <div>
                    {meta && focus && (
                        <DropdownSelect
                            aria-readonly
                            value={meta.semanticType}
                            onChange={(e) => {
                                if (onChange) {
                                    onChange(code, 'semanticType', e.target.value as ISemanticType);
                                }
                            }}
                        >
                            {DataTypeOptions.map((op) => (
                                <option key={op.key} value={op.key}>
                                    {intl.get(`common.semanticType.${op.key}`)}
                                </option>
                            ))}
                        </DropdownSelect>
                    )}
                    {meta && focus && (
                        <DropdownSelect
                            value={meta?.analyticType}
                            onChange={(e) => {
                                if (onChange) {
                                    // FIXME: 弱约束问题
                                    onChange(code, 'analyticType', e.target.value as IAnalyticType);
                                }
                            }}
                        >
                            {optionsOfBIFieldType.map((op) => (
                                <option key={op.key} value={op.key}>
                                    {op.text}
                                </option>
                            ))}
                        </DropdownSelect>
                    )}
                    {meta && focus && (
                        <div className="checkbox-container">
                            <label>{intl.get('dataSource.useField')}</label>
                            <input
                                checked={!disable}
                                type="checkbox"
                                onChange={(e) => {
                                    onChange && onChange(code, 'disable', !e.target.checked);
                                }}
                            />
                        </div>
                    )}
                </div>
                {meta && !focus && <StatTable features={meta.features} semanticType={meta.semanticType} />}
            </div>
        </HeaderCellContainer>
    );
};

export default HeaderCell;
