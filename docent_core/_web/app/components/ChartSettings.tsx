import { ArrowLeftRight, FunnelPlus, Download, Scale } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import posthog from 'posthog-js';

import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

import { useAppSelector } from '../store/hooks';
import {
  ChartSpec,
  ChartDimension,
  ComplexFilter,
  PrimitiveFilter,
} from '../types/collectionTypes';
import {
  useGetChartMetadataQuery,
  useGetChartDataQuery,
} from '../api/chartApi';
import { FilterControls, toggleFilterDisabledState } from './FilterControls';
import { FilterChips } from './FilterChips';
import { useGetAgentRunMetadataFieldsQuery } from '../api/collectionApi';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import SelectWithSubmenus, {
  SelectWithSubmenusItem,
  SelectWithSubmenusSub,
  SelectWithSubmenusSubContent,
  SelectWithSubmenusSubTrigger,
} from '@/components/ui/select-with-submenus';
import { useHasCollectionWritePermission } from '@/lib/permissions/hooks';

import { exportChartToPng, exportChartToCsv } from '../utils/exportChart';

interface ChartSettingsProps {
  chart: ChartSpec;
  onChange: (chart: ChartSpec) => void;
}

function DimensionSelect({
  dim,
  onChange,
  fields,
  allowNone = true,
  disabled = false,
  widthClass = 'w-16',
}: {
  dim: string | null;
  onChange: (dim: string | null) => void;
  fields: ChartDimension[];
  allowNone?: boolean;
  disabled?: boolean;
  widthClass?: string;
}) {
  const judgeGroups: Record<
    string,
    {
      name: string;
      judge_version: number;
      items: { key: string; label: string }[];
    }
  > = {};
  const allItems = fields.map((f) => ({ key: f.key, label: f.name }));
  const selectedLabel = useMemo(() => {
    if (dim == null) return 'None';
    return allItems.find((i) => i.key === dim)?.label || dim;
  }, [dim, allItems]);
  const runMetadataFields = [] as ChartDimension[];
  const judgeFields = [] as ChartDimension[];
  const countFields = [] as ChartDimension[];
  for (const field of fields) {
    if (field.kind === 'judge_output') {
      judgeGroups[field.judge_id] = judgeGroups[field.judge_id] || {
        name: field.judge_name,
        judge_version: field.judge_version,
        items: [],
      };
      judgeGroups[field.judge_id].items.push({
        key: field.key,
        label: field.name,
      });
    } else {
      if (field.key.startsWith('ar.metadata_json')) {
        runMetadataFields.push(field);
      } else if (field.key.startsWith('jr.output')) {
        judgeFields.push(field);
      } else {
        countFields.push(field);
      }
    }
  }

  return (
    <div className={widthClass}>
      <SelectWithSubmenus
        selectedKey={dim}
        onChange={onChange}
        selectedLabel={selectedLabel}
        allowNone={allowNone}
        disabled={disabled}
        className="h-6 text-xs px-2"
      >
        {countFields.map((f) => (
          <SelectWithSubmenusItem key={f.key} value={f.key}>
            {f.name}
          </SelectWithSubmenusItem>
        ))}
        {runMetadataFields.length > 0 && (
          <SelectWithSubmenusSub>
            <SelectWithSubmenusSubTrigger className="text-xs">
              Run Metadata
            </SelectWithSubmenusSubTrigger>
            <SelectWithSubmenusSubContent>
              {runMetadataFields.map((f) => (
                <SelectWithSubmenusItem key={f.key} value={f.key}>
                  {f.name}
                </SelectWithSubmenusItem>
              ))}
            </SelectWithSubmenusSubContent>
          </SelectWithSubmenusSub>
        )}
        {Object.values(judgeGroups).map((jg) => (
          <SelectWithSubmenusSub key={jg.name}>
            <SelectWithSubmenusSubTrigger className="text-xs">
              <Scale className="h-4 w-4 mr-2 text-muted-foreground" />
              <span className="mr-1">{jg.name}</span>
              <span className="text-muted-foreground">v{jg.judge_version}</span>
            </SelectWithSubmenusSubTrigger>
            <SelectWithSubmenusSubContent>
              {jg.items.map((item) => (
                <SelectWithSubmenusItem key={item.key} value={item.key}>
                  {item.label}
                </SelectWithSubmenusItem>
              ))}
            </SelectWithSubmenusSubContent>
          </SelectWithSubmenusSub>
        ))}
      </SelectWithSubmenus>
    </div>
  );
}

export default function ChartSettings({ chart, onChange }: ChartSettingsProps) {
  const { x_key, y_key, series_key, runs_filter } = chart;
  const collectionId = useAppSelector((state) => state.collection.collectionId);
  const hasWritePermission = useHasCollectionWritePermission();
  const { data: metadataFieldsData } = useGetAgentRunMetadataFieldsQuery(
    collectionId!,
    {
      skip: !collectionId,
    }
  );
  const agentRunMetadataFields = metadataFieldsData?.fields ?? [];
  const [filterPopoverOpen, setFilterPopoverOpen] = useState(false);
  const [editingFilter, setEditingFilter] = useState<PrimitiveFilter | null>(
    null
  );

  // Get chart metadata (fields + search queries) in one request
  const { data: chartMetadata } = useGetChartMetadataQuery(
    { collectionId: collectionId! },
    { skip: !collectionId }
  );

  // Reuse chart data cache for export without extra requests
  const { data: chartDataResponse, isFetching: isFetchingChartData } =
    useGetChartDataQuery(
      { collectionId: collectionId!, chartId: chart.id },
      { skip: !collectionId }
    );

  // In the new system, innerBinKey and outerBinKey are metadata keys directly
  const innerDim = useMemo(() => {
    if (!x_key) return null;
    return x_key;
  }, [x_key]);

  const outerDim = useMemo(() => {
    if (!series_key) return null;
    return series_key;
  }, [series_key]);

  const handleInnerDimChange = (value: string | null) => {
    if (!collectionId || value == null) return;
    onChange({ ...chart, x_key: value, series_key });
  };

  const handleOuterDimChange = (value: string | null) => {
    if (!collectionId) return;
    onChange({ ...chart, x_key, series_key: value });
  };

  const handleSwapDimensions = () => {
    if (x_key && series_key) {
      onChange({
        ...chart,
        x_key: series_key,
        series_key: x_key,
      });
    }
  };

  const showSwapButton = innerDim && outerDim;

  function handleChartTypeChange(value: string) {
    onChange({ ...chart, chart_type: value as 'bar' | 'line' | 'table' });
  }

  function handleYDimChange(value: string | null) {
    if (value == null) return;
    onChange({ ...chart, y_key: value });
  }

  function handleRunsFilterChange(runsFilter: ComplexFilter | null) {
    onChange({ ...chart, runs_filter: runsFilter });
    // Clear the editing filter when filters change
    setEditingFilter(null);
  }

  const removeFilter = (filterId: string) => {
    if (!runs_filter) return;

    const updatedFilters = runs_filter.filters.filter((f) => f.id !== filterId);

    if (updatedFilters.length === 0) {
      handleRunsFilterChange(null);
    } else {
      handleRunsFilterChange({
        ...runs_filter,
        filters: updatedFilters,
      });
    }
  };

  const editFilter = (filter: PrimitiveFilter) => {
    if (!runs_filter) return;

    // Remove the filter first
    const updatedFilters = runs_filter.filters.filter(
      (f) => f.id !== filter.id
    );

    if (updatedFilters.length === 0) {
      handleRunsFilterChange(null);
    } else {
      handleRunsFilterChange({
        ...runs_filter,
        filters: updatedFilters,
      });
    }

    // Set the filter to edit and open the popover
    setEditingFilter(filter);
    setFilterPopoverOpen(true);
  };

  const clearAllFilters = () => {
    handleRunsFilterChange(null);
  };

  const handleToggleFilter = (filterId: string) => {
    const updatedFilters = toggleFilterDisabledState(
      runs_filter ?? null,
      filterId
    );
    if (!runs_filter || !updatedFilters || updatedFilters === runs_filter) {
      return;
    }

    handleRunsFilterChange(updatedFilters);
  };

  const handleDownloadPng = async () => {
    try {
      posthog.capture('chart_download_png', {
        chart_id: chart.id,
        chart_name: chart.name || 'untitled',
        chart_type: chart.chart_type,
        x_key: chart.x_key,
        y_key: chart.y_key,
        series_key: chart.series_key,
      });

      await exportChartToPng(chart.id, chart.name || 'chart');
    } catch (e) {
      console.error('Failed to export chart PNG', e);
    }
  };

  const handleDownloadCsv = () => {
    try {
      const binStats = chartDataResponse?.result?.binStats;
      if (isFetchingChartData || !binStats) return;

      posthog.capture('chart_download_csv', {
        chart_id: chart.id,
        chart_name: chart.name || 'untitled',
        chart_type: chart.chart_type,
        x_key: chart.x_key,
        y_key: chart.y_key,
        series_key: chart.series_key,
      });

      exportChartToCsv(chart, binStats, chart.name || 'chart');
    } catch (e) {
      console.error('Failed to export chart CSV', e);
    }
  };

  const dimensions = chartMetadata?.dimensions || [];
  const measures = chartMetadata?.measures || [];

  return (
    <div className="flex flex-row flex-wrap p-2">
      <div className="flex flex-row flex-1 flex-wrap items-center gap-x-2 gap-y-1">
        <div className="flex items-center gap-x-1">
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            Series:
          </span>
          <DimensionSelect
            dim={outerDim}
            onChange={handleOuterDimChange}
            fields={dimensions}
            disabled={!hasWritePermission}
          />
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 hover:bg-accent transition-all duration-200 text-muted-foreground hover:text-primary flex-shrink-0"
            onClick={handleSwapDimensions}
            title="Swap dimensions"
            disabled={!showSwapButton || !hasWritePermission}
          >
            <ArrowLeftRight size={14} className="stroke-[1.5]" />
          </Button>

          <span className="text-xs text-muted-foreground whitespace-nowrap">
            X:
          </span>
          <DimensionSelect
            dim={innerDim}
            onChange={handleInnerDimChange}
            fields={dimensions}
            allowNone={false}
            disabled={!hasWritePermission}
          />

          <span className="text-xs text-muted-foreground whitespace-nowrap">
            Y:
          </span>
          <DimensionSelect
            dim={y_key ?? null}
            onChange={handleYDimChange}
            fields={measures}
            allowNone={false}
            disabled={!hasWritePermission}
            widthClass="w-24"
          />
        </div>

        <div className="flex items-center gap-x-1">
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            Type:
          </span>
          <Select
            value={chart.chart_type}
            onValueChange={handleChartTypeChange}
            disabled={!hasWritePermission}
          >
            <SelectTrigger className="h-6 max-w-24 w-24 text-xs border-border bg-transparent hover:bg-secondary px-2 font-normal">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="bar" className="text-xs">
                Bar
              </SelectItem>
              <SelectItem value="line" className="text-xs">
                Line
              </SelectItem>
              <SelectItem value="table" className="text-xs">
                Table
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-x-1">
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            Filters:
          </span>

          {runs_filter && (
            <FilterChips
              filters={runs_filter}
              onRemoveFilter={removeFilter}
              onEditFilter={editFilter}
              onClearAllFilters={clearAllFilters}
              onToggleFilter={handleToggleFilter}
              className="mr-1"
              disabled={!hasWritePermission}
            />
          )}

          {/* Add filter button/popover */}
          <Popover open={filterPopoverOpen} onOpenChange={setFilterPopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="h-6 px-1 hover:bg-accent transition-all duration-200 text-muted-foreground hover:text-primary flex-shrink-0"
                title="Add filter"
                disabled={!hasWritePermission}
              >
                <FunnelPlus size={18} className="stroke-[1.5]" />
                <span className="text-xs">Add Filter</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent
              align="start"
              sideOffset={4}
              className="w-[520px] overflow-x-auto"
            >
              <FilterControls
                filters={runs_filter}
                onFiltersChange={handleRunsFilterChange}
                metadataFields={agentRunMetadataFields}
                collectionId={collectionId!}
                showFilterChips={false}
                showStepFilter={false}
                initialFilter={editingFilter}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 hover:bg-accent transition-all duration-200 text-muted-foreground hover:text-primary"
            title="Download"
          >
            <Download size={14} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleDownloadPng}>
            Download PNG
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={handleDownloadCsv}
            disabled={
              isFetchingChartData || !chartDataResponse?.result?.binStats
            }
          >
            Download CSV
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
