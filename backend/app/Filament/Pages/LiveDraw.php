<?php

namespace App\Filament\Pages;

use App\Filament\Resources\Competitions\CompetitionResource;
use App\Models\Competition;
use App\Services\CompetitionState;
use BackedEnum;
use Filament\Pages\Page;
use Filament\Support\Icons\Heroicon;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Concerns\InteractsWithTable;
use Filament\Tables\Contracts\HasTable;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;

/**
 * Pick the competition to draw on the live stream. Each row opens that competition's draw screen (/live-draw/{slug})
 * in a new tab, where "Reveal Winner" plays the reveal of the winners Verity drew at the closing time. Nothing on this
 * page or the screen picks, re-rolls or reorders a winner.
 */
class LiveDraw extends Page implements HasTable
{
    use InteractsWithTable;

    protected static string|BackedEnum|null $navigationIcon = Heroicon::OutlinedVideoCamera;

    protected static ?string $title = 'Live Draw';

    protected static ?string $navigationLabel = 'Live Draw';

    protected static ?int $navigationSort = 2;

    protected static ?string $slug = 'live-draw';

    protected string $view = 'filament.pages.table-report';

    public function getSubheading(): ?string
    {
        return 'Choose the competition you are drawing. Its draw screen opens in a new tab: share that tab on the stream and press "Reveal Winner". Verity draws every winner at the closing time; the screen only reveals them.';
    }

    public function table(Table $table): Table
    {
        $state = app(CompetitionState::class);

        return $table
            ->query(Competition::query()->published()->where(fn (Builder $q) => $q->where('type', 'draw')->orWhereNotNull('end_prize_name')))
            ->defaultSort('closes_at', 'desc')
            ->recordUrl(fn (Competition $c) => '/live-draw/'.$c->slug, shouldOpenInNewTab: true)
            ->columns([
                TextColumn::make('title')->searchable()->wrap()
                    ->description(fn (Competition $c) => (string) ($c->end_prize_name ?? $c->title)),
                TextColumn::make('closes_at')->label('Draw')->sortable()->dateTime('D j M Y, g:ia', 'Europe/London'),
                TextColumn::make('status')->badge()->state(fn (Competition $c) => $state->status($c)),
                TextColumn::make('places')->label('Winners')->state(fn (Competition $c) => $c->endPrizeCount()),
            ])
            ->recordActions([
                CompetitionResource::liveDrawAction()->label('Open Draw Screen'),
            ])
            ->emptyStateHeading('No draws yet')
            ->emptyStateDescription('A competition appears here once it has a live draw and has been published.')
            ->paginated([25, 50]);
    }
}
