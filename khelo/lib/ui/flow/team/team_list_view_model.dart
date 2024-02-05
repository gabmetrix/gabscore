import 'package:data/api/team/team_model.dart';
import 'package:data/service/team/team_service.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:freezed_annotation/freezed_annotation.dart';

part 'team_list_view_model.freezed.dart';

final teamListViewStateProvider =
    StateNotifierProvider.autoDispose<TeamListViewNotifier, TeamListViewState>(
        (ref) {
  return TeamListViewNotifier(ref.read(teamServiceProvider));
});

class TeamListViewNotifier extends StateNotifier<TeamListViewState> {
  final TeamService _teamService;

  TeamListViewNotifier(this._teamService) : super(const TeamListViewState()) {
    loadTeamList();
  }

  Future<void> loadTeamList() async {
    state = state.copyWith(loading: true);
    try {
      final res = await _teamService.getTeamsWithPlayers();
      state = state.copyWith(teams: res, loading: false);
    } catch (e) {
      state = state.copyWith(loading: false);
      debugPrint("TeamListViewNotifier: error while loading team list");
    }
  }
}

@freezed
class TeamListViewState with _$TeamListViewState {
  const factory TeamListViewState({
    Object? error,
    @Default([]) List<TeamModel> teams,
    @Default(true) bool loading,
  }) = _TeamListViewState;
}
