import 'dart:async';
import 'package:collection/collection.dart';
import 'package:data/api/match/match_model.dart';
import 'package:data/service/match/match_service.dart';
import 'package:data/storage/app_preferences.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:freezed_annotation/freezed_annotation.dart';
import 'package:khelo/domain/extensions/context_extensions.dart';

part 'home_view_model.freezed.dart';

final homeViewStateProvider =
    StateNotifierProvider.autoDispose<HomeViewNotifier, HomeViewState>(
  (ref) {
    final notifier = HomeViewNotifier(ref.read(matchServiceProvider));
    ref.listen(
        hasUserSession, (_, next) => notifier._onUserSessionUpdate(next));
    return notifier;
  },
);

class HomeViewNotifier extends StateNotifier<HomeViewState> {
  final MatchService _matchService;
  late StreamSubscription _streamSubscription;

  HomeViewNotifier(this._matchService) : super(const HomeViewState()) {
    _loadMatches();
  }

  void _onUserSessionUpdate(bool hasSession) {
    if (!hasSession) {
      _streamSubscription.cancel();
    }
  }

  void _loadMatches() async {
    state = state.copyWith(loading: state.matches.isEmpty);

    _streamSubscription = _matchService.getMatches().listen(
      (matches) {
        final groupMatches = _groupMatches(matches);
        state = state.copyWith(
          tempMatches: matches,
          matches: groupMatches,
          loading: false,
          error: null,
        );
      },
      onError: (e) {
        state = state.copyWith(error: e, loading: false);
        debugPrint("HomeViewNotifier: error while load matches -> $e");
      },
    );
  }

  Map<MatchStatusLabel, List<MatchModel>> _groupMatches(
      List<MatchModel> matches) {
    final groupedMatches = groupBy(matches, (match) {
      switch (match.match_status) {
        case MatchStatus.running:
          return MatchStatusLabel.live;
        case MatchStatus.yetToStart:
          return MatchStatusLabel.upcoming;
        case MatchStatus.abandoned:
        case MatchStatus.finish:
          return MatchStatusLabel.winning;
      }
    });
    return {
      MatchStatusLabel.live: groupedMatches[MatchStatusLabel.live] ?? [],
      MatchStatusLabel.upcoming:
          groupedMatches[MatchStatusLabel.upcoming] ?? [],
      MatchStatusLabel.winning: groupedMatches[MatchStatusLabel.winning] ?? [],
    };
  }

  onResume() {
    _streamSubscription.cancel();
    _loadMatches();
  }

  @override
  void dispose() {
    _streamSubscription.cancel();
    super.dispose();
  }
}

@freezed
class HomeViewState with _$HomeViewState {
  const factory HomeViewState({
    Object? error,
    @Default(false) bool loading,
    @Default([]) List<MatchModel> tempMatches,
    @Default({}) Map<MatchStatusLabel, List<MatchModel>> matches,
  }) = _HomeViewState;
}

enum MatchStatusLabel {
  live,
  upcoming,
  winning;

  String getString(BuildContext context) {
    switch (this) {
      case MatchStatusLabel.live:
        return context.l10n.home_screen_live_title;
      case MatchStatusLabel.upcoming:
        return context.l10n.home_screen_upcoming_title;
      case MatchStatusLabel.winning:
        return context.l10n.home_screen_winning_title;
    }
  }
}
