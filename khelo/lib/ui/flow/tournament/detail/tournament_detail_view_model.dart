import 'dart:async';

import 'package:data/api/match/match_model.dart';
import 'package:data/api/team/team_model.dart';
import 'package:data/api/tournament/tournament_model.dart';
import 'package:data/service/tournament/tournament_service.dart';
import 'package:data/storage/app_preferences.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:freezed_annotation/freezed_annotation.dart';
import 'package:khelo/domain/extensions/context_extensions.dart';

part 'tournament_detail_view_model.freezed.dart';

final tournamentDetailStateProvider = StateNotifierProvider.autoDispose<
    TournamentDetailStateViewNotifier, TournamentDetailState>(
  (ref) => TournamentDetailStateViewNotifier(
    ref.read(tournamentServiceProvider),
    ref.read(currentUserPod)?.id,
  ),
);

class TournamentDetailStateViewNotifier
    extends StateNotifier<TournamentDetailState> {
  final TournamentService _tournamentService;
  StreamSubscription? _tournamentSubscription;

  TournamentDetailStateViewNotifier(
    this._tournamentService,
    String? userId,
  ) : super(TournamentDetailState(currentUserId: userId));

  String? _tournamentId;

  void setData(String tournamentId) {
    _tournamentId = tournamentId;
    loadTournament();
  }

  void loadTournament() async {
    if (_tournamentId == null) return;
    _tournamentSubscription?.cancel();

    state = state.copyWith(loading: true);

    _tournamentSubscription = _tournamentService
        .streamTournamentById(_tournamentId!)
        .listen((tournament) {
      final teamPoints = _calculatePointsTable(tournament);
      state = state.copyWith(
        tournament: tournament,
        teamPoints: teamPoints,
        loading: false,
      );
      onMatchFilter(null);
      onStatFilter(state.selectedFilterTag);
    }, onError: (e) {
      state = state.copyWith(error: e, loading: false);
      debugPrint(
          "TournamentDetailStateViewNotifier: error while loading tournament list -> $e");
    });
  }

  void onTabChange(int tab) {
    if (state.selectedTab != tab) {
      state = state.copyWith(selectedTab: tab);
    }
  }

  void onTeamsSelected(List<TeamModel> teams) async {
    if (state.tournament == null) return;
    try {
      final teamIds = teams.map((e) => e.id).toList();
      await _tournamentService.updateTeamIds(state.tournament!.id, teamIds);
    } catch (e) {
      state = state.copyWith(actionError: e);
      debugPrint(
          "TournamentDetailStateViewNotifier: error while selecting teams -> $e");
    }
  }

  void onMatchesSelected(List<MatchModel> matches) async {
    if (state.tournament == null) return;
    try {
      final matchIds = matches.map((e) => e.id).toList();
      await _tournamentService.updateMatchIds(state.tournament!.id, matchIds);
    } catch (e) {
      state = state.copyWith(actionError: e);
      debugPrint(
          "TournamentDetailStateViewNotifier: error while selecting matches -> $e");
    }
  }

  void onMatchFilter(String? filter) {
    if (state.tournament == null) return;

    final matches = state.tournament!.matches;

    if (filter == null) {
      state = state.copyWith(filteredMatches: matches);
      return;
    }
    final names = state.tournament!.teams.map((e) => e.name).toList();

    if (names.contains(filter)) {
      final filteredMatches = matches.where((match) {
        return match.teams.any((team) => team.team.name == filter);
      }).toList();

      state = state.copyWith(
        matchFilter: filter,
        filteredMatches: filteredMatches,
      );
    } else {
      state = state.copyWith(matchFilter: filter, filteredMatches: matches);
    }
  }

  void onStatFilter(KeyStatFilterTag tag) {
    if (state.tournament == null) return;

    var filteredStats = state.tournament!.keyStats;

    filteredStats = filteredStats.where((e) {
      switch (tag) {
        case KeyStatFilterTag.all:
          return true;
        case KeyStatFilterTag.runs:
          return (e.stats.battingStat?.runScored ?? 0) > 0;
        case KeyStatFilterTag.wickets:
          return (e.stats.bowlingStat?.wicketTaken ?? 0.0) > 0.0;
        case KeyStatFilterTag.battingAverage:
          return (e.stats.battingStat?.average ?? 0.0) > 0.0;
        case KeyStatFilterTag.bowlingAverage:
          return (e.stats.bowlingStat?.average ?? 0.0) > 0.0;
        case KeyStatFilterTag.mostHundreds:
          return (e.stats.battingStat?.hundreds ?? 0) > 0;
        case KeyStatFilterTag.mostFifties:
          return (e.stats.battingStat?.fifties ?? 0) > 0;
        case KeyStatFilterTag.sixes:
          return (e.stats.battingStat?.sixes ?? 0) > 0;
        case KeyStatFilterTag.fours:
          return (e.stats.battingStat?.fours ?? 0) > 0;
        case KeyStatFilterTag.boundaries:
          return (e.stats.battingStat?.fours ?? 0) +
                  (e.stats.battingStat?.sixes ?? 0) >
              0;
      }
    }).toList();

    filteredStats.sort((a, b) {
      int compareByTag(PlayerKeyStat x, PlayerKeyStat y) {
        switch (tag) {
          case KeyStatFilterTag.mostHundreds:
            return (y.stats.battingStat?.hundreds ?? 0)
                .compareTo(x.stats.battingStat?.hundreds ?? 0);
          case KeyStatFilterTag.mostFifties:
            return (y.stats.battingStat?.fifties ?? 0)
                .compareTo(x.stats.battingStat?.fifties ?? 0);
          case KeyStatFilterTag.boundaries:
            return ((y.stats.battingStat?.fours ?? 0) +
                    (y.stats.battingStat?.sixes ?? 0))
                .compareTo((x.stats.battingStat?.fours ?? 0) +
                    (x.stats.battingStat?.sixes ?? 0));
          default:
            return (b.stats.battingStat?.runScored ?? 0)
                .compareTo(a.stats.battingStat?.runScored ?? 0);
        }
      }

      return compareByTag(a, b);
    });

    filteredStats.sort((a, b) => (b.stats.battingStat?.runScored ?? 0)
        .compareTo(a.stats.battingStat?.runScored ?? 0));

    state = state.copyWith(
      filteredStats: filteredStats,
      selectedFilterTag: tag,
    );
  }

  List<TeamPoint> _calculatePointsTable(TournamentModel tournament) {
    List<TeamPoint> teamPoints = [];

    final finishedMatches = tournament.matches
        .where((match) => match.match_status == MatchStatus.finish)
        .toList();

    if (finishedMatches.isEmpty) return [];

    for (final team in tournament.teams) {
      final matches = finishedMatches
          .where((element) => element.team_ids.contains(team.id))
          .toList();
      final teamStat = matches.teamStat(team.id);
      //If team has won then add 2 points and tie then add 1 point
      final points = teamStat.status.win * 2 + teamStat.status.tie;
      teamPoints.add(TeamPoint(
        team: team,
        stat: teamStat,
        points: points,
        matchCount: matches.length,
      ));
    }
    return teamPoints..sort((a, b) => b.points.compareTo(a.points));
  }

  @override
  void dispose() {
    _tournamentSubscription?.cancel();
    super.dispose();
  }
}

@freezed
class TournamentDetailState with _$TournamentDetailState {
  const factory TournamentDetailState({
    @Default(null) TournamentModel? tournament,
    @Default(false) bool loading,
    @Default(0) int selectedTab,
    Object? error,
    Object? actionError,
    String? currentUserId,
    @Default(null) String? matchFilter,
    @Default([]) List<MatchModel> filteredMatches,
    @Default(KeyStatFilterTag.all) KeyStatFilterTag selectedFilterTag,
    @Default([]) List<PlayerKeyStat> filteredStats,
    @Default([]) List<TeamPoint> teamPoints,
  }) = _TournamentDetailState;
}

enum KeyStatFilterTag {
  all,
  runs,
  wickets,
  battingAverage,
  bowlingAverage,
  mostHundreds,
  mostFifties,
  sixes,
  fours,
  boundaries;

  String getString(BuildContext context) {
    switch (this) {
      case KeyStatFilterTag.all:
        return context.l10n.key_stat_all;
      case KeyStatFilterTag.runs:
        return context.l10n.key_stat_filter_runs;
      case KeyStatFilterTag.wickets:
        return context.l10n.key_stat_filter_wickets;
      case KeyStatFilterTag.battingAverage:
        return context.l10n.common_batting_average_title;
      case KeyStatFilterTag.bowlingAverage:
        return context.l10n.common_bowling_average_title;
      case KeyStatFilterTag.mostHundreds:
        return context.l10n.key_stat_filter_most_hundreds;
      case KeyStatFilterTag.mostFifties:
        return context.l10n.key_stat_filter_most_fifties;
      case KeyStatFilterTag.sixes:
        return context.l10n.key_stat_filter_sixes;
      case KeyStatFilterTag.fours:
        return context.l10n.key_stat_filter_fours;
      case KeyStatFilterTag.boundaries:
        return context.l10n.key_stat_filter_boundaries;
    }
  }
}
