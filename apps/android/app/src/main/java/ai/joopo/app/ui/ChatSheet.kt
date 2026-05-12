package ai.joopo.app.ui

import ai.joopo.app.MainViewModel
import ai.joopo.app.ui.chat.ChatSheetContent
import androidx.compose.runtime.Composable

@Composable
fun ChatSheet(viewModel: MainViewModel) {
  ChatSheetContent(viewModel = viewModel)
}
