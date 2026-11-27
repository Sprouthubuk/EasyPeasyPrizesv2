<?php

namespace App\Filament\Widgets;

use App\Filament\Support\Daily;
use Filament\Widgets\ChartWidget;
use Illuminate\Support\Carbon;

class SalesChart extends ChartWidget
{
    protected static ?int $sort = 3;

    protected ?string $heading = 'Takings, Last 30 Days';

    protected int|string|array $columnSpan = 'full';

    protected ?string $maxHeight = '280px';

    protected function getData(): array
    {
        $tickets = Daily::takings(30);
        $topUps = Daily::takings(30, 'deposit');

        return [
            'datasets' => [
                [
                    'label' => 'Ticket sales (£)',
                    'data' => array_map(fn ($p) => round($p / 100, 2), array_values($tickets)),
                    'borderColor' => '#FF1E8C',
                    'backgroundColor' => 'rgba(255,30,140, 0.18)',
                    'fill' => true,
                    'tension' => 0.35,
                    'pointRadius' => 0,
                    'borderWidth' => 3,
                ],
                [
                    'label' => 'Top ups (£)',
                    'data' => array_map(fn ($p) => round($p / 100, 2), array_values($topUps)),
                    'borderColor' => '#3FD8FF',
                    'backgroundColor' => 'rgba(63,216,255, 0.08)',
                    'fill' => true,
                    'tension' => 0.35,
                    'pointRadius' => 0,
                    'borderWidth' => 2,
                ],
            ],
            'labels' => array_map(fn ($d) => Carbon::parse($d)->format('j M'), array_keys($tickets)),
        ];
    }

    protected function getType(): string
    {
        return 'line';
    }

    protected function getOptions(): array
    {
        return [
            'plugins' => ['legend' => ['labels' => ['color' => '#d8d0e2', 'usePointStyle' => true]]],
            'scales' => [
                'x' => ['grid' => ['display' => false], 'ticks' => ['color' => '#8e84a0', 'maxTicksLimit' => 8]],
                'y' => ['grid' => ['color' => 'rgba(255,255,255,0.06)'], 'ticks' => ['color' => '#8e84a0'], 'beginAtZero' => true],
            ],
        ];
    }
}
